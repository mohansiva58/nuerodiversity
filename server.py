import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split # type: ignore
from sklearn.ensemble import RandomForestClassifier # type: ignore
from sklearn.preprocessing import LabelEncoder # type: ignore
import pickle
from flask import Flask, request, jsonify
from flask_cors import CORS
import logging

app = Flask(__name__)
CORS(app)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def generate_synthetic_data(n_samples=1000):
    np.random.seed(42)
    data = {
        "focus_difficulty": np.random.choice([0, 1], n_samples, p=[0.5, 0.5]),  # More balanced
        "routine_preference": np.random.choice([0, 1], n_samples, p=[0.5, 0.5]),
        "reading_struggle": np.random.choice([0, 1], n_samples, p=[0.6, 0.4]),
        "time_management": np.random.choice([0, 1], n_samples, p=[0.5, 0.5]),
        "social_overwhelm": np.random.choice([0, 1], n_samples, p=[0.6, 0.4]),
        "instruction_difficulty": np.random.choice([0, 1], n_samples, p=[0.6, 0.4]),
        "distractibility": np.random.choice([0, 1], n_samples, p=[0.5, 0.5]),
        "intense_interests": np.random.choice([0, 1], n_samples, p=[0.5, 0.5]),
        "spelling_issues": np.random.choice([0, 1], n_samples, p=[0.6, 0.4]),
        "restlessness": np.random.choice([0, 1], n_samples, p=[0.5, 0.5])
    }

    labels = []
    for i in range(n_samples):
        adhd_score = data["focus_difficulty"][i] + data["time_management"][i] + \
                     data["distractibility"][i] + data["restlessness"][i]
        autism_score = data["routine_preference"][i] + data["social_overwhelm"][i] + \
                       data["intense_interests"][i]
        dyslexia_score = data["reading_struggle"][i] + data["instruction_difficulty"][i] + \
                         data["spelling_issues"][i]

        # Lowered thresholds for more sensitivity
        if adhd_score >= 2:  # Was 3
            labels.append("ADHD")
        elif autism_score >= 1:  # Was 2
            labels.append("Autism")
        elif dyslexia_score >= 1:  # Was 2
            labels.append("Dyslexia")
        else:
            labels.append("None")

    df = pd.DataFrame(data)
    df["label"] = labels
    logger.info("Label Distribution:\n%s", df["label"].value_counts())
    return df

def train_and_save_model():
    df = generate_synthetic_data()
    X = df.drop("label", axis=1)
    y = df["label"]
    
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)

    X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2, random_state=42)
    model = RandomForestClassifier(n_estimators=100, random_state=42)
    model.fit(X_train, y_train)
    
    accuracy = model.score(X_test, y_test)
    logger.info("Model trained with accuracy: %.2f%%", accuracy * 100)
    
    with open("model.pkl", "wb") as f:
        pickle.dump({"model": model, "le": le, "accuracy": accuracy}, f)
    
    return model, le, accuracy

def load_model():
    try:
        with open("model.pkl", "rb") as f:
            data = pickle.load(f)
        expected_features = 10
        model_features = data["model"].n_features_in_
        if model_features != expected_features:
            logger.warning("Model expects %d features, but current setup uses %d. Retraining...", model_features, expected_features)
            return None, None, None
        return data["model"], data["le"], data.get("accuracy", None)
    except FileNotFoundError:
        return None, None, None

model, le, accuracy = load_model()
if model is None:
    logger.info("No valid model found. Training new model...")
    model, le, accuracy = train_and_save_model()

questions = [
    {"id": 1, "text": "Do you often find it hard to focus on tasks for long periods?"},
    {"id": 2, "text": "Do you prefer routines and get upset when they change?"},
    {"id": 3, "text": "Do you struggle with reading or mix up letters/words?"},
    {"id": 4, "text": "Do you frequently lose track of time or forget appointments?"},
    {"id": 5, "text": "Do you find social situations overwhelming or hard to navigate?"},
    {"id": 6, "text": "Do you have difficulty following spoken instructions?"},
    {"id": 7, "text": "Are you easily distracted by noises or movements around you?"},
    {"id": 8, "text": "Do you have intense interests in specific topics?"},
    {"id": 9, "text": "Do you often reverse numbers or struggle with spelling?"},
    {"id": 10, "text": "Do you feel restless or fidget a lot when sitting still?"}
]

@app.route('/questions', methods=['GET'])
def get_questions():
    return jsonify(questions)

@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.json
        logger.info("Received Data: %s", data)
        
        responses = [int(data.get(str(i), 0)) for i in range(10)]
        if any(r not in [0, 1] for r in responses):
            return jsonify({"error": "Responses must be 0 or 1"}), 400
        
        logger.info("Converted Responses: %s", responses)
        prediction = model.predict([responses])[0]
        probabilities = model.predict_proba([responses])[0]
        result = le.inverse_transform([prediction])[0]
        
        # Map probabilities to class names
        prob_dict = {le.classes_[i]: float(prob * 100) for i, prob in enumerate(probabilities)}
        logger.info("Prediction: %s, Probabilities: %s", result, prob_dict)
        
        return jsonify({"prediction": result, "probabilities": prob_dict})
    except Exception as e:
        logger.error("Prediction error: %s", str(e))
        return jsonify({"error": "Server error"}), 500

@app.route('/model-info', methods=['GET'])
def get_model_info():
    try:
        _, _, acc = load_model()
        return jsonify({"accuracy": acc * 100 if acc else None})
    except Exception as e:
        logger.error("Model info error: %s", str(e))
        return jsonify({"error": "Could not load model info"}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000)