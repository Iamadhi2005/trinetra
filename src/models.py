import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.cluster import KMeans

class OneClassKMeans:
    """
    Custom One-Class Classifier using K-Means.
    Learns normal clusters, and detects anomalies based on distance thresholds.
    """
    def __init__(self, n_clusters=3, threshold_quantile=0.97):
        self.n_clusters = n_clusters
        self.threshold_quantile = threshold_quantile
        self.kmeans = KMeans(n_clusters=self.n_clusters, random_state=42, n_init='auto')
        self.max_distance_threshold = 0.0
        
    def fit(self, X):
        self.kmeans.fit(X)
        # Calculate distances of training samples to their closest centroid
        distances = np.min(self.kmeans.transform(X), axis=1)
        # Set threshold at the specified quantile (e.g. 97th percentile)
        self.max_distance_threshold = np.quantile(distances, self.threshold_quantile)
        
    def score_samples(self, X):
        # Return distance to nearest centroid
        return np.min(self.kmeans.transform(X), axis=1)
        
    def predict(self, X):
        distances = self.score_samples(X)
        # Returns -1 for anomalies, 1 for normal
        predictions = np.ones(X.shape[0])
        predictions[distances > self.max_distance_threshold] = -1
        return predictions

class VitalAnomalyDetector:
    def __init__(self, model_type="IsolationForest"):
        self.model_type = model_type
        self.features_mean = None
        self.features_std = None
        
        if model_type == "IsolationForest":
            # contamination='auto' prevents forcing normal baseline data into fake anomalies
            self.model = IsolationForest(contamination='auto', random_state=42)
        elif model_type == "KMeans":
            self.model = OneClassKMeans(n_clusters=3, threshold_quantile=0.97)
        else:
            raise ValueError("Unknown model type")
            
        self.is_trained = False
        
    def preprocess(self, X, fit=False):
        """Normalizes features (Mean-0, Variance-1)."""
        if fit:
            self.features_mean = np.mean(X, axis=0)
            self.features_std = np.std(X, axis=0)
            # Enforce minimum standard deviation floor to avoid over-sensitivity to tiny noise
            self.features_std = np.maximum(self.features_std, [2.0, 0.5, 5.0, 0.1])
            
        return (X - self.features_mean) / self.features_std

    def train(self, data_list):
        """
        Trains the anomaly detector on a baseline of normal vital records.
        Each record is [heart_rate, spo2, lead_impedance, infusion_rate].
        """
        X = np.array(data_list)
        if len(X) < 10:
            return False  # Not enough calibration samples
            
        # Re-initialize the model to clear any pre-trained weights from joblib loading
        if self.model_type == "IsolationForest":
            self.model = IsolationForest(contamination='auto', random_state=42)
        elif self.model_type == "KMeans":
            self.model = OneClassKMeans(n_clusters=3, threshold_quantile=0.97)
            
        X_norm = self.preprocess(X, fit=True)
        self.model.fit(X_norm)
        self.is_trained = True
        return True

    def predict_anomaly(self, sample):
        """
        Predicts if a single vital signs sample is anomalous.
        Returns: True if anomaly, False if normal.
        """
        if not self.is_trained or self.features_mean is None:
            return False  # Default to normal if not trained
            
        X = np.array([sample])
        X_norm = self.preprocess(X, fit=False)
        
        pred = self.model.predict(X_norm)[0]
        if hasattr(self.model, "score_samples"):
            score = self.model.score_samples(X_norm)[0]
            return pred == -1 and score < -0.15
        return pred == -1
        
        # Use decision function score directly with a small safety margin
        # to avoid false positives on boundary normal samples in small training sets
        if self.model_type == "IsolationForest":
            score = self.model.decision_function(X_norm)
            return score[0] < -0.015
        else:
            pred = self.model.predict(X_norm)
            return pred[0] == -1

class CUSUMDriftDetector:
    """
    Cumulative Sum (CUSUM) detector to identify slow vital drift (stealth poisoning).
    """
    def __init__(self, threshold=5.0, drift=0.5):
        self.threshold = threshold
        self.drift = drift
        self.g_pos = 0.0
        self.g_neg = 0.0
        
    def reset(self):
        self.g_pos = 0.0
        self.g_neg = 0.0
        
    def update(self, val, mean, std):
        """
        Updates CUSUM statistics with a new standardized value.
        Returns: True if drift is detected, False otherwise.
        """
        if std == 0:
            std = 1.0
        z = (val - mean) / std
        
        # Calculate positive and negative cumulative sums
        self.g_pos = max(0.0, self.g_pos + z - self.drift)
        self.g_neg = max(0.0, self.g_neg - z - self.drift)
        
        if self.g_pos > self.threshold or self.g_neg > self.threshold:
            self.reset()
            return True
        return False
