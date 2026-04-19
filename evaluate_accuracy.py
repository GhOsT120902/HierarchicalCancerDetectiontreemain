"""
Accuracy evaluation script for the hierarchical cancer inference pipeline.

Processes every image in `Test Data/` and produces an accuracy report at three
levels: organ classification, normal/abnormal assessment, and cancer subtype.

Usage:
    python evaluate_accuracy.py
    python evaluate_accuracy.py --test-data-dir "Test Data/Test Data" --results-dir results
"""

from __future__ import annotations

import argparse
import json
import sys
from collections import defaultdict
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.utils import (
    SUBTYPE_CLASSES,
    SUBTYPE_DISPLAY_NAMES,
    SUBTYPE_TO_ORGAN,
    ORGAN_CLASSES,
    configure_logging,
)
from backend.inference_engine import HierarchicalCancerInference

DEFAULT_TEST_DATA_DIR = PROJECT_ROOT / "Test Data" / "Test Data"
DEFAULT_RESULTS_DIR = PROJECT_ROOT / "results"

ORGAN_FOLDER_TO_INDEX: dict[str, int] = {
    "ALL": 0,
    "Brain Cancer": 1,
    "Breast Cancer": 2,
    "Cervical Cancer": 3,
    "Kidney Cancer": 4,
    "Lung and Colon Cancer": 5,
    "Lymphoma": 6,
    "Oral Cancer": 7,
}

SUBTYPE_NAME_TO_INDEX: dict[str, int] = {v: k for k, v in SUBTYPE_CLASSES.items()}

NORMAL_SUBTYPE_NAMES: frozenset[str] = frozenset(
    name
    for name in SUBTYPE_CLASSES.values()
    if name.endswith("_normal") or name.endswith("_healthy")
)

_ORGAN_FOLDER_LOWER: dict[str, int] = {k.lower(): v for k, v in ORGAN_FOLDER_TO_INDEX.items()}
_SUBTYPE_NAME_LOWER: dict[str, int] = {k.lower(): v for k, v in SUBTYPE_NAME_TO_INDEX.items()}
_SUBTYPE_INDEX_TO_CODE: dict[int, str] = dict(SUBTYPE_CLASSES)


def _normalize(name: str) -> str:
    return name.lower().replace("-", "_").replace(" ", "_")


def build_ground_truth(
    organ_folder: str, subtype_folder: str
) -> dict[str, object] | None:
    organ_index = ORGAN_FOLDER_TO_INDEX.get(organ_folder)
    if organ_index is None:
        organ_index = _ORGAN_FOLDER_LOWER.get(organ_folder.lower())
    if organ_index is None:
        return None

    subtype_index = SUBTYPE_NAME_TO_INDEX.get(subtype_folder)
    if subtype_index is None:
        subtype_index = _SUBTYPE_NAME_LOWER.get(subtype_folder.lower())
    if subtype_index is None:
        norm = _normalize(subtype_folder)
        subtype_index = next(
            (idx for key, idx in _SUBTYPE_NAME_LOWER.items() if _normalize(key) == norm),
            None,
        )
    if subtype_index is None:
        return None

    subtype_code = _SUBTYPE_INDEX_TO_CODE[subtype_index]
    is_normal = subtype_code in NORMAL_SUBTYPE_NAMES
    return {
        "organ_index": organ_index,
        "organ_label": ORGAN_CLASSES[organ_index],
        "subtype_index": subtype_index,
        "subtype_label": subtype_code,
        "subtype_display": SUBTYPE_DISPLAY_NAMES[subtype_index],
        "expected_normality": "NORMAL" if is_normal else "ABNORMAL",
    }


def _organ_only_ground_truth(organ_folder: str) -> dict[str, object] | None:
    organ_index = ORGAN_FOLDER_TO_INDEX.get(organ_folder)
    if organ_index is None:
        organ_index = _ORGAN_FOLDER_LOWER.get(organ_folder.lower())
    if organ_index is None:
        return None
    return {
        "organ_index": organ_index,
        "organ_label": ORGAN_CLASSES[organ_index],
        "subtype_index": None,
        "subtype_label": None,
        "subtype_display": None,
        "expected_normality": None,
    }


def collect_image_paths(
    test_data_dir: Path, logger=None, organ_filter: str | None = None
) -> list[tuple[Path, dict[str, object]]]:
    entries: list[tuple[Path, dict[str, object]]] = []
    image_extensions = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif"}
    skipped_folders: list[str] = []
    organ_filter_lower = organ_filter.lower() if organ_filter else None

    for organ_dir in sorted(test_data_dir.iterdir()):
        if not organ_dir.is_dir():
            continue
        organ_folder = organ_dir.name
        if organ_filter_lower and organ_folder.lower() != organ_filter_lower:
            continue

        children = list(organ_dir.iterdir())
        has_subdirs = any(p.is_dir() for p in children)
        has_images_direct = any(
            p.is_file() and p.suffix.lower() in image_extensions for p in children
        )

        if has_subdirs:
            for subtype_dir in sorted(p for p in children if p.is_dir()):
                subtype_folder = subtype_dir.name
                gt = build_ground_truth(organ_folder, subtype_folder)
                if gt is None:
                    skipped_folders.append(f"{organ_folder}/{subtype_folder}")
                    continue
                for image_file in sorted(subtype_dir.iterdir()):
                    if image_file.suffix.lower() in image_extensions:
                        entries.append((image_file, gt))

        if has_images_direct and not has_subdirs:
            gt = _organ_only_ground_truth(organ_folder)
            if gt is None:
                skipped_folders.append(organ_folder)
            else:
                if logger is not None:
                    logger.warning(
                        "Images found directly in organ folder '%s' (no subtype subfolder). "
                        "Only organ-level accuracy will be evaluated for these images.",
                        organ_folder,
                    )
                for image_file in sorted(p for p in children if p.is_file() and p.suffix.lower() in image_extensions):
                    entries.append((image_file, gt))

    if skipped_folders and logger is not None:
        for folder in skipped_folders:
            logger.warning("Skipped unrecognised folder (no label mapping): %s", folder)

    return entries


def evaluate(
    engine: HierarchicalCancerInference,
    entries: list[tuple[Path, dict[str, object]]],
    logger,
) -> list[dict[str, object]]:
    results: list[dict[str, object]] = []
    total = len(entries)

    for i, (image_path, gt) in enumerate(entries, start=1):
        if i % 50 == 0 or i == 1 or i == total:
            logger.info("Processing image %d / %d: %s", i, total, image_path.name)

        prediction = engine.predict(image_path=image_path, manual_override=True)

        organ_pred_index: int | None = None
        organ_correct: bool | None = None
        normality_pred: str | None = None
        normality_correct: bool | None = None
        subtype_pred_label: str | None = None
        subtype_correct: bool | None = None
        pipeline_status = prediction.get("status", "UNKNOWN")

        level1 = prediction.get("level1") or prediction.get("tissue") or prediction.get("organ_prediction")
        if level1 is not None:
            organ_pred_index = level1.get("selected_class_index") if level1.get("selected_class_index") is not None else level1.get("class_index")
            if organ_pred_index is not None:
                organ_correct = int(organ_pred_index) == int(gt["organ_index"])

        has_subtype_gt = gt.get("subtype_label") is not None

        level2 = prediction.get("level2") or prediction.get("normality")
        if has_subtype_gt and level2 is not None and level2.get("status") not in (None, "NOT_EVALUATED"):
            normality_pred = level2.get("status")
            if normality_pred in ("NORMAL", "ABNORMAL"):
                normality_correct = normality_pred == gt["expected_normality"]

        level3 = prediction.get("level3") or prediction.get("subtype") or prediction.get("subtype_prediction")
        if has_subtype_gt and level3 is not None:
            raw_label = level3.get("label")
            if raw_label is not None:
                subtype_key = None
                for k, v in SUBTYPE_DISPLAY_NAMES.items():
                    if v == raw_label:
                        subtype_key = SUBTYPE_CLASSES.get(k)
                        break
                if subtype_key is None:
                    subtype_key = raw_label
                subtype_pred_label = subtype_key
                subtype_correct = subtype_key == gt["subtype_label"]

        results.append(
            {
                "image_path": str(image_path),
                "organ_folder": image_path.parent.parent.name,
                "subtype_folder": image_path.parent.name,
                "ground_truth": gt,
                "pipeline_status": pipeline_status,
                "organ_pred_index": organ_pred_index,
                "organ_correct": organ_correct,
                "normality_pred": normality_pred,
                "normality_correct": normality_correct,
                "subtype_pred_label": subtype_pred_label,
                "subtype_correct": subtype_correct,
            }
        )

    return results


def compute_metrics(results: list[dict[str, object]]) -> dict[str, object]:
    total = len(results)

    organ_total = organ_correct = 0
    normality_total = normality_correct = 0
    subtype_total = subtype_correct = 0

    per_class_organ:    dict[str, dict[str, int]] = defaultdict(lambda: {"total": 0, "correct": 0})
    per_class_normality:dict[str, dict[str, int]] = defaultdict(lambda: {"total": 0, "correct": 0})
    per_class_subtype:  dict[str, dict[str, int]] = defaultdict(lambda: {"total": 0, "correct": 0})

    # Track how many times each class label was *predicted* (needed for FP → precision).
    organ_predicted_as:    dict[str, int] = defaultdict(int)
    normality_predicted_as:dict[str, int] = defaultdict(int)
    subtype_predicted_as:  dict[str, int] = defaultdict(int)

    confusion: dict[str, dict[str, int]] = defaultdict(lambda: defaultdict(int))

    for r in results:
        gt = r["ground_truth"]
        true_organ     = gt["organ_label"]
        true_normality = gt["expected_normality"]
        true_subtype   = gt["subtype_label"]

        if r["organ_correct"] is not None:
            organ_total += 1
            per_class_organ[true_organ]["total"] += 1
            if r["organ_correct"]:
                organ_correct += 1
                per_class_organ[true_organ]["correct"] += 1
            pred_organ_label = ORGAN_CLASSES.get(int(r["organ_pred_index"])) if r["organ_pred_index"] is not None else None
            if pred_organ_label:
                organ_predicted_as[pred_organ_label] += 1

        if r["normality_correct"] is not None:
            normality_total += 1
            per_class_normality[true_normality]["total"] += 1
            if r["normality_correct"]:
                normality_correct += 1
                per_class_normality[true_normality]["correct"] += 1
            if r["normality_pred"]:
                normality_predicted_as[r["normality_pred"]] += 1

        if true_normality == "NORMAL":
            pass
        elif r["subtype_correct"] is not None:
            subtype_total += 1
            per_class_subtype[true_subtype]["total"] += 1
            confusion[true_subtype][str(r["subtype_pred_label"])] += 1
            if r["subtype_correct"]:
                subtype_correct += 1
                per_class_subtype[true_subtype]["correct"] += 1
            if r["subtype_pred_label"]:
                subtype_predicted_as[str(r["subtype_pred_label"])] += 1
        else:
            per_class_subtype[true_subtype]["total"] += 1
            confusion[true_subtype]["(pipeline_stopped_early)"] += 1

    def pct(num: int, den: int) -> float:
        return round(100.0 * num / den, 2) if den > 0 else 0.0

    def _precision_recall_f1(tp: int, total_true: int, total_predicted: int) -> tuple[float, float, float]:
        """Return (precision_pct, recall_pct, f1_pct) all in 0-100 range."""
        fp         = max(0, total_predicted - tp)
        fn         = total_true - tp
        precision  = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall     = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1         = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0
        return round(precision * 100, 2), round(recall * 100, 2), round(f1 * 100, 2)

    def build_per_class(per_class_map: dict, predicted_as_map: dict) -> dict:
        out: dict[str, dict] = {}
        for k, v in sorted(per_class_map.items()):
            tp             = v["correct"]
            total_true     = v["total"]
            total_predicted = predicted_as_map.get(k, 0)
            precision_pct, recall_pct, f1_pct = _precision_recall_f1(tp, total_true, total_predicted)
            out[k] = {
                "correct":      tp,
                "total":        total_true,
                "accuracy_pct": pct(tp, total_true),
                "precision":    precision_pct,
                "recall":       recall_pct,
                "f1":           f1_pct,
            }
        return out

    per_class_organ_out     = build_per_class(per_class_organ,     organ_predicted_as)
    per_class_normality_out = build_per_class(per_class_normality, normality_predicted_as)
    per_class_subtype_out   = build_per_class(per_class_subtype,   subtype_predicted_as)

    pipeline_statuses: dict[str, int] = defaultdict(int)
    for r in results:
        pipeline_statuses[r["pipeline_status"]] += 1

    return {
        "total_images": total,
        "pipeline_status_counts": dict(pipeline_statuses),
        "organ": {
            "evaluated": organ_total,
            "correct": organ_correct,
            "accuracy_pct": pct(organ_correct, organ_total),
            "per_class": per_class_organ_out,
        },
        "normality": {
            "evaluated": normality_total,
            "correct": normality_correct,
            "accuracy_pct": pct(normality_correct, normality_total),
            "per_class": per_class_normality_out,
        },
        "subtype": {
            "evaluated": subtype_total,
            "correct": subtype_correct,
            "accuracy_pct": pct(subtype_correct, subtype_total),
            "per_class": per_class_subtype_out,
            "confusion_matrix": {k: dict(v) for k, v in sorted(confusion.items())},
        },
    }


def format_text_report(metrics: dict[str, object]) -> str:
    lines: list[str] = []

    def hr(char: str = "=", width: int = 72) -> str:
        return char * width

    lines.append(hr())
    lines.append("HIERARCHICAL CANCER INFERENCE — ACCURACY REPORT")
    lines.append(hr())
    lines.append(f"Total images evaluated : {metrics['total_images']}")

    status_counts = metrics.get("pipeline_status_counts", {})
    lines.append("\nPipeline status breakdown:")
    for status, count in sorted(status_counts.items()):
        lines.append(f"  {status:<22} {count:>5}")

    lines.append("")
    lines.append(hr())
    lines.append("LEVEL 1 — ORGAN / TISSUE CLASSIFICATION")
    lines.append(hr())
    organ = metrics["organ"]
    lines.append(
        f"  Evaluated: {organ['evaluated']}   Correct: {organ['correct']}   "
        f"Accuracy: {organ['accuracy_pct']:.2f}%"
    )
    lines.append("")
    lines.append(f"  {'Class':<35} {'Correct':>7}  {'Total':>5}  {'Acc %':>6}")
    lines.append("  " + "-" * 60)
    for cls, stats in organ["per_class"].items():
        lines.append(
            f"  {cls:<35} {stats['correct']:>7}  {stats['total']:>5}  {stats['accuracy_pct']:>6.2f}%"
        )

    lines.append("")
    lines.append(hr())
    lines.append("LEVEL 2 — NORMAL / ABNORMAL ASSESSMENT")
    lines.append(hr())
    norm = metrics["normality"]
    lines.append(
        f"  Evaluated: {norm['evaluated']}   Correct: {norm['correct']}   "
        f"Accuracy: {norm['accuracy_pct']:.2f}%"
    )
    lines.append("")
    lines.append(f"  {'Class':<35} {'Correct':>7}  {'Total':>5}  {'Acc %':>6}")
    lines.append("  " + "-" * 60)
    for cls, stats in norm["per_class"].items():
        lines.append(
            f"  {cls:<35} {stats['correct']:>7}  {stats['total']:>5}  {stats['accuracy_pct']:>6.2f}%"
        )

    lines.append("")
    lines.append(hr())
    lines.append("LEVEL 3 — CANCER SUBTYPE CLASSIFICATION")
    lines.append("  (Applies only to images routed through the ABNORMAL path at Level 2.")
    lines.append("   Images correctly identified as NORMAL are assessed at Level 2 only.)")
    lines.append(hr())
    sub = metrics["subtype"]
    lines.append(
        f"  Evaluated: {sub['evaluated']}   Correct: {sub['correct']}   "
        f"Accuracy: {sub['accuracy_pct']:.2f}%"
    )
    lines.append("")
    lines.append(f"  {'Subtype (true)':<25} {'Correct':>7}  {'Total':>5}  {'Acc %':>6}")
    lines.append("  " + "-" * 55)
    for cls, stats in sub["per_class"].items():
        lines.append(
            f"  {cls:<25} {stats['correct']:>7}  {stats['total']:>5}  {stats['accuracy_pct']:>6.2f}%"
        )

    lines.append("")
    lines.append(hr("-"))
    lines.append("SUBTYPE CONFUSION SUMMARY (true → predicted counts)")
    lines.append(hr("-"))
    confusion = sub.get("confusion_matrix", {})
    for true_label, preds in sorted(confusion.items()):
        lines.append(f"  {true_label}:")
        for pred_label, count in sorted(preds.items(), key=lambda x: -x[1]):
            marker = "✓" if pred_label == true_label else " "
            lines.append(f"    {marker} {pred_label:<30} {count:>4}")

    lines.append("")
    lines.append(hr())
    return "\n".join(lines)


def main() -> None:
    parser = argparse.ArgumentParser(description="Evaluate hierarchical cancer inference accuracy.")
    parser.add_argument(
        "--test-data-dir",
        type=Path,
        default=DEFAULT_TEST_DATA_DIR,
        help="Path to the test data root folder containing organ subfolders.",
    )
    parser.add_argument(
        "--results-dir",
        type=Path,
        default=DEFAULT_RESULTS_DIR,
        help="Directory to write accuracy_report.json and accuracy_report.txt.",
    )
    parser.add_argument("--log-level", type=str, default="WARNING")
    args = parser.parse_args()

    logger = configure_logging(args.log_level)
    logger.setLevel("INFO")

    test_data_dir = args.test_data_dir
    if not test_data_dir.exists():
        print(f"ERROR: Test data directory not found: {test_data_dir}", file=sys.stderr)
        sys.exit(1)

    results_dir = args.results_dir
    results_dir.mkdir(parents=True, exist_ok=True)

    print("Loading inference engine...")
    engine = HierarchicalCancerInference(logger=logger)

    engine._generate_gradcam = lambda *args, **kwargs: None  # skip Grad-CAM backward passes for speed

    status = engine.get_model_status()
    print(f"  Organ model ready  : {status['organ_ready']}")
    print(f"  Subtype model ready: {status['subtype_ready']}")
    print()

    print(f"Collecting images from: {test_data_dir}")
    entries = collect_image_paths(test_data_dir, logger=logger)
    print(f"  Found {len(entries)} images across {len(set(gt['subtype_label'] for _, gt in entries))} subtype classes.\n")

    if not entries:
        print("ERROR: No images found. Check that the test data directory is correct.", file=sys.stderr)
        sys.exit(1)

    print("Running inference (this may take a few minutes)...")
    raw_results = evaluate(engine, entries, logger)

    print("Computing metrics...")
    metrics = compute_metrics(raw_results)

    json_path = results_dir / "accuracy_report.json"
    txt_path = results_dir / "accuracy_report.txt"

    report_payload = {"metrics": metrics, "per_image_results": raw_results}
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(report_payload, f, indent=2, default=str)
    print(f"  JSON report saved: {json_path}")

    text_report = format_text_report(metrics)
    with open(txt_path, "w", encoding="utf-8") as f:
        f.write(text_report)
    print(f"  Text report saved: {txt_path}")

    print()
    print(text_report)


if __name__ == "__main__":
    main()
