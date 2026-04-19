export const DEMO_EMAIL = 'demo@medai.demo';

export const DEMO_RESULT = {
  ok: true,
  final_decision: 'Malignant — Glioma',
  status: 'Abnormal',
  modality: { type: 'Histopathology', status: 'Valid', color: 'green', confidence: 0.993 },
  organ_prediction: { label: 'Brain Cancer', confidence: 0.974, selected_label: 'Brain Cancer', status: 'HIGH_CONFIDENCE', color: 'green' },
  normality: { label: 'Abnormal', status: 'Abnormal', color: 'red', confidence: 0.941 },
  subtype_prediction: { label: 'Glioma', confidence: 0.912, interpreted_label: 'Glioma', status: 'HIGH_CONFIDENCE', color: 'green' },
  charts: {
    organ: {
      title: 'Organ Probability Distribution',
      items: [
        { label: 'Brain Cancer', confidence: 0.974, highlight: true },
        { label: 'Breast Cancer', confidence: 0.012, highlight: false },
        { label: 'Lung and Colon', confidence: 0.008, highlight: false },
        { label: 'Kidney Cancer', confidence: 0.006, highlight: false },
      ],
    },
    subtype: {
      title: 'Subtype Probability Distribution',
      items: [
        { label: 'Glioma', confidence: 0.912, highlight: true },
        { label: 'Meningioma', confidence: 0.061, highlight: false },
        { label: 'No Tumor', confidence: 0.027, highlight: false },
      ],
    },
  },
};

export const DEMO_HISTORY = [
  {
    id: 'demo_h001',
    timestamp: Date.now() - 2 * 24 * 3600 * 1000,
    filename: 'brain_glioma_sample_01.jpg',
    thumbnailDataUrl: null,
    hasReport: true,
    result: {
      final_decision: 'Malignant — Glioma',
      status: 'Abnormal',
      organ_prediction: { label: 'Brain Cancer', confidence: 0.974, selected_label: 'Brain Cancer', status: 'HIGH_CONFIDENCE', color: 'green' },
      normality: { label: 'Abnormal', status: 'Abnormal', color: 'red', confidence: 0.941 },
      subtype_prediction: { label: 'Glioma', confidence: 0.912, interpreted_label: 'Glioma', status: 'HIGH_CONFIDENCE', color: 'green' },
      modality: { type: 'Histopathology', status: 'Valid', color: 'green', confidence: 0.993 },
    },
  },
  {
    id: 'demo_h002',
    timestamp: Date.now() - 24 * 3600 * 1000,
    filename: 'breast_malignant_biopsy_042.png',
    thumbnailDataUrl: null,
    hasReport: true,
    result: {
      final_decision: 'Malignant — Breast Malignant',
      status: 'Abnormal',
      organ_prediction: { label: 'Breast Cancer', confidence: 0.956, selected_label: 'Breast Cancer', status: 'HIGH_CONFIDENCE', color: 'green' },
      normality: { label: 'Abnormal', status: 'Abnormal', color: 'red', confidence: 0.883 },
      subtype_prediction: { label: 'Breast Malignant', confidence: 0.864, interpreted_label: 'Breast Malignant', status: 'HIGH_CONFIDENCE', color: 'green' },
      modality: { type: 'Histopathology', status: 'Valid', color: 'green', confidence: 0.987 },
    },
  },
  {
    id: 'demo_h003',
    timestamp: Date.now() - 5 * 3600 * 1000,
    filename: 'lung_adenocarcinoma_p17.jpg',
    thumbnailDataUrl: null,
    hasReport: false,
    result: {
      final_decision: 'Malignant — Lung Adenocarcinoma',
      status: 'Abnormal',
      organ_prediction: { label: 'Lung and Colon Cancer', confidence: 0.931, selected_label: 'Lung and Colon Cancer', status: 'HIGH_CONFIDENCE', color: 'green' },
      normality: { label: 'Abnormal', status: 'Abnormal', color: 'red', confidence: 0.907 },
      subtype_prediction: { label: 'Lung Adenocarcinoma', confidence: 0.889, interpreted_label: 'Lung Adenocarcinoma', status: 'HIGH_CONFIDENCE', color: 'green' },
      modality: { type: 'Histopathology', status: 'Valid', color: 'green', confidence: 0.971 },
    },
  },
  {
    id: 'demo_h004',
    timestamp: Date.now() - 2 * 3600 * 1000,
    filename: 'cervical_normal_tissue_003.png',
    thumbnailDataUrl: null,
    hasReport: true,
    result: {
      final_decision: 'Normal — No abnormality detected',
      status: 'Normal',
      organ_prediction: { label: 'Cervical Cancer', confidence: 0.889, selected_label: 'Cervical Cancer', status: 'HIGH_CONFIDENCE', color: 'green' },
      normality: { label: 'Normal', status: 'Normal', color: 'green', confidence: 0.921 },
      subtype_prediction: null,
      modality: { type: 'Histopathology', status: 'Valid', color: 'green', confidence: 0.964 },
    },
  },
];
