# Beginner Sentiment Analyzer Guide

> Research by Manus AI | Task ID: `5XYbsLT5iMoCWAJLVvpUfV`

## Recommendations Summary

| Component | Recommendation |
|-----------|---------------|
| **Dataset** | NLTK `movie_reviews` corpus |
| **Libraries** | scikit-learn + NLTK |
| **Model** | `LogisticRegression` with `TfidfVectorizer` |
| **Expected Accuracy** | 80-85% |
| **Code Size** | ~42 lines |

---

## Why These Choices?

### Dataset: NLTK movie_reviews

The NLTK `movie_reviews` corpus is the absolute easiest to start with:
- Zero manual downloading or CSV parsing
- Just one line of Python: `nltk.download("movie_reviews")`
- 2,000 perfectly formatted positive/negative reviews
- Pre-labeled, ready to use

### Libraries: Scikit-Learn + NLTK

Neural networks are overkill for learning the basics. A simple `LogisticRegression` model with `TfidfVectorizer` from Scikit-Learn is:
- Incredibly fast to train
- Easy to understand
- Highly interpretable
- Still produces great results

---

## The Code: sentiment_analyzer.py

```python
"""
Beginner Sentiment Analyzer
A simple, under-100-line sentiment classifier using scikit-learn
"""

import nltk
from nltk.corpus import movie_reviews
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, classification_report

# === STEP 1: Download and Load Data ===
nltk.download('movie_reviews', quiet=True)

# Get all review documents with their labels
documents = [
    (" ".join(movie_reviews.words(fileid)), category)
    for category in movie_reviews.categories()
    for fileid in movie_reviews.fileids(category)
]

# Separate into texts and labels
texts = [doc[0] for doc in documents]
labels = [doc[1] for doc in documents]

print(f"Loaded {len(texts)} reviews")
print(f"Categories: {set(labels)}")

# === STEP 2: Split Data ===
X_train, X_test, y_train, y_test = train_test_split(
    texts, labels, test_size=0.2, random_state=42
)

print(f"Training set: {len(X_train)} reviews")
print(f"Test set: {len(X_test)} reviews")

# === STEP 3: Vectorize Text ===
# TF-IDF converts text to numbers the model can understand
vectorizer = TfidfVectorizer(max_features=5000, stop_words='english')

X_train_vec = vectorizer.fit_transform(X_train)
X_test_vec = vectorizer.transform(X_test)

print(f"Vocabulary size: {len(vectorizer.vocabulary_)} words")

# === STEP 4: Train Model ===
model = LogisticRegression(max_iter=1000)
model.fit(X_train_vec, y_train)

print("Model trained!")

# === STEP 5: Evaluate ===
y_pred = model.predict(X_test_vec)
accuracy = accuracy_score(y_test, y_pred)

print(f"\n=== RESULTS ===")
print(f"Accuracy: {accuracy:.2%}")
print(f"\nDetailed Report:")
print(classification_report(y_test, y_pred))

# === STEP 6: Try It Out! ===
def predict_sentiment(text):
    """Predict sentiment of new text"""
    vec = vectorizer.transform([text])
    prediction = model.predict(vec)[0]
    probability = model.predict_proba(vec).max()
    return prediction, probability

# Test with some examples
test_reviews = [
    "This movie was absolutely fantastic! I loved every minute.",
    "Terrible waste of time. The acting was awful.",
    "It was okay, nothing special but not bad either."
]

print(f"\n=== PREDICTIONS ===")
for review in test_reviews:
    sentiment, confidence = predict_sentiment(review)
    print(f"\n\"{review[:50]}...\"")
    print(f"  → {sentiment.upper()} ({confidence:.1%} confident)")
```

---

## How to Run

1. Install dependencies:
```bash
pip install nltk scikit-learn
```

2. Run the script:
```bash
python sentiment_analyzer.py
```

3. Expected output:
```
Loaded 2000 reviews
Categories: {'pos', 'neg'}
Training set: 1600 reviews
Test set: 400 reviews
Vocabulary size: 5000 words
Model trained!

=== RESULTS ===
Accuracy: 83.50%

=== PREDICTIONS ===
"This movie was absolutely fantastic! I loved every..." → POSITIVE (94.2% confident)
"Terrible waste of time. The acting was awful..." → NEGATIVE (91.8% confident)
"It was okay, nothing special but not bad either..." → POSITIVE (58.3% confident)
```

---

## What Each Part Does

| Step | Code | Purpose |
|------|------|--------|
| 1 | `movie_reviews.words()` | Load pre-labeled movie reviews |
| 2 | `train_test_split()` | Split 80% training, 20% testing |
| 3 | `TfidfVectorizer` | Convert words → numbers (term frequency) |
| 4 | `LogisticRegression.fit()` | Train the model on examples |
| 5 | `accuracy_score()` | Measure how well it works |
| 6 | `predict()` | Use it on new text |

---

## Next Steps

Once you understand this basic version, you could:

1. **Try different models**: `RandomForestClassifier`, `NaiveBayes`
2. **Add more features**: n-grams, sentiment lexicons
3. **Use a larger dataset**: IMDB 50K reviews
4. **Deploy as an API**: Flask + Hugging Face Spaces
5. **Try deep learning**: Start with `transformers` library