import pandas as pd
import numpy as np
from scipy import stats
from sklearn.model_selection import cross_val_score, StratifiedKFold
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
import os
import re


def analyze_text(text):
    CONTRACT_RE = re.compile(
        r"\b(don't|won't|can't|it's|I'm|you're|they're|we're|isn't|aren't|"
        r"wasn't|weren't|hasn't|haven't|hadn't|couldn't|wouldn't|shouldn't|"
        r"didn't|doesn't|I'll|you'll|we'll|they'll|I've|you've|we've|they've|"
        r"I'd|you'd|we'd|they'd|he's|she's|that's|what's|there's|here's|let's|who's)\b",
        re.IGNORECASE,
    )
    FIRST_PERSON_RE = re.compile(r"\b(I|me|my|mine|myself)\b")
    NOM_RE = re.compile(r"\b\w+(?:tion|ment|ness|ity|ence|ance)\b", re.IGNORECASE)
    TRANSITION_RE = re.compile(
        r"\b(However|Moreover|Furthermore|Additionally|Consequently|Nevertheless|"
        r"Nonetheless|Importantly|Specifically|Ultimately|Fundamentally|Indeed|"
        r"Notably|Interestingly|Crucially|Essentially|Particularly)\b"
    )
    ANTI_PATTERNS = [
        re.compile(r"\bnot\s+\w+[,;]\s*but\b", re.IGNORECASE),
        re.compile(r"\b\w+[,;]\s*not\s+\w+", re.IGNORECASE),
        re.compile(r"\brather\s+than\b", re.IGNORECASE),
        re.compile(r"\binstead\s+of\b", re.IGNORECASE),
        re.compile(r"\bnothing\s+was\b", re.IGNORECASE),
        re.compile(r"\bnot\s+through\b.*\bthrough\b", re.IGNORECASE),
        re.compile(r"\bnot\s+just\b", re.IGNORECASE),
    ]
    HEDGE_RE = re.compile(
        r"\b(perhaps|might|maybe|could|would|possibly|usually|often|sometimes|seem|appears?|suggests?|tend|mostly|probably|largely|apparently)\b",
        re.IGNORECASE,
    )

    text = re.sub(r"^---[\s\S]*?---", "", text)
    text = re.sub(r"```[\s\S]*?```", "", text)
    text = re.sub(r"<[^>]+>", "", text)

    words = [w for w in text.split() if w.strip()]
    totalWords = len(words)
    if totalWords == 0:
        return None

    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    totalSentences = len(sentences)
    if totalSentences == 0:
        return None

    sent_lens = [len([w for w in s.split() if w.strip()]) for s in sentences]
    avgSentLen = np.mean(sent_lens)
    sentLenStdDev = np.std(sent_lens, ddof=1) if len(sent_lens) > 1 else 0
    shortSentRatio = sum(1 for l in sent_lens if l <= 5) / totalSentences * 100
    longSentRatio = sum(1 for l in sent_lens if l >= 25) / totalSentences * 100

    emdash = text.count("—") + text.count("--")
    emdashPer1k = emdash / totalWords * 1000

    absnoun = len(NOM_RE.findall(text))
    nomDensity = absnoun / totalWords * 100

    contractions = len(CONTRACT_RE.findall(text))
    contractionPer1k = contractions / totalWords * 1000

    firstPerson = len(FIRST_PERSON_RE.findall(text))
    firstPersonPer1k = firstPerson / totalWords * 1000

    questions = sum(1 for s in sentences if s.endswith("?"))
    questionRate = questions / totalSentences * 100

    transitions = len(TRANSITION_RE.findall(text))
    transitionPer1k = transitions / totalWords * 1000

    hedge = len(HEDGE_RE.findall(text))
    hedgePer1k = hedge / totalWords * 1000

    paren = text.count("(")
    parenPer1k = paren / totalWords * 1000

    exclamation = sum(1 for s in sentences if s.endswith("!"))
    exclamationRate = exclamation / totalSentences * 100

    semicolon = text.count(";")
    semicolonPer1k = semicolon / totalWords * 1000

    colon = text.count(":")
    colonPer1k = colon / totalWords * 1000

    epigram = 0
    antithesis = 0
    isocolon = 0
    anadiplosis = 0

    for i, s in enumerate(sentences):
        s_clean = re.sub(r"[.!?]+$", "", s).strip()
        s_words = [w for w in s_clean.split() if len(w) > 0]

        if i > 0 and 0 < len(s_words) <= 6:
            prev_clean = re.sub(r"[.!?]+$", "", sentences[i - 1]).strip()
            prev_words = [w for w in prev_clean.split() if len(w) > 0]
            if len(prev_words) > 10:
                epigram += 1

        for pattern in ANTI_PATTERNS:
            if pattern.search(s):
                antithesis += 1
                break

        if i < len(sentences) - 1:
            next_clean = re.sub(r"[.!?]+$", "", sentences[i + 1]).strip()
            next_words = [w for w in next_clean.split() if len(w) > 0]

            if (
                len(s_words) >= 5
                and len(next_words) >= 5
                and abs(len(s_words) - len(next_words)) <= 1
            ):
                isocolon += 1

            tail = [re.sub(r"[^a-z]", "", w.lower()) for w in s_words[-2:]]
            head = [re.sub(r"[^a-z]", "", w.lower()) for w in next_words[:3]]
            for tw in tail:
                if len(tw) >= 4 and tw in head:
                    anadiplosis += 1
                    break

    epigramPer1k = epigram / totalWords * 1000
    isocolonPer1k = isocolon / totalWords * 1000
    antithesisPer1k = antithesis / totalWords * 1000
    anadipPer1k = anadiplosis / totalWords * 1000

    return {
        "avgSentLen": avgSentLen,
        "sentLenStdDev": sentLenStdDev,
        "shortSentRatio": shortSentRatio,
        "longSentRatio": longSentRatio,
        "emdash": emdash,
        "emdashPer1k": emdashPer1k,
        "absnoun": absnoun,
        "nomDensity": nomDensity,
        "epigram": epigram,
        "epigramPer1k": epigramPer1k,
        "isocolon": isocolon,
        "isocolonPer1k": isocolonPer1k,
        "antithesis": antithesis,
        "antithesisPer1k": antithesisPer1k,
        "anadiplosis": anadiplosis,
        "anadipPer1k": anadipPer1k,
        "contractionPer1k": contractionPer1k,
        "firstPersonPer1k": firstPersonPer1k,
        "questionRate": questionRate,
        "transitionPer1k": transitionPer1k,
        "hedgePer1k": hedgePer1k,
        "parenPer1k": parenPer1k,
        "exclamationRate": exclamationRate,
        "semicolonPer1k": semicolonPer1k,
        "colonPer1k": colonPer1k,
    }


def main():
    df = pd.read_csv("calibration-data-v3.tsv", sep="\t")
    cat_a = df[df["cat"] == "A-human-pre"]
    cat_c = df[df["cat"] == "C-ai-co"]

    features = [
        c
        for c in df.columns
        if c not in ["cat", "label", "totalWords", "totalSentences"]
    ]

    results = []
    for f in features:
        a_vals = cat_a[f].dropna()
        c_vals = cat_c[f].dropna()

        stat, p = stats.mannwhitneyu(a_vals, c_vals, alternative="two-sided")

        n1, n2 = len(a_vals), len(c_vals)
        var1, var2 = a_vals.var(ddof=1), c_vals.var(ddof=1)
        pooled_sd = np.sqrt(((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2))
        d = (a_vals.mean() - c_vals.mean()) / pooled_sd if pooled_sd > 0 else 0

        results.append(
            {
                "feature": f,
                "p_value": p,
                "cohens_d": d,
                "abs_d": abs(d),
                "A_mean": a_vals.mean(),
                "C_mean": c_vals.mean(),
            }
        )

    results_df = pd.DataFrame(results)
    results_df["p_bonferroni"] = np.minimum(results_df["p_value"] * len(features), 1.0)
    results_df = results_df.sort_values("abs_d", ascending=False)

    print("=== Task 2: Feature Ranking (A vs C) ===")
    print(
        results_df[["feature", "cohens_d", "p_bonferroni"]]
        .head(15)
        .to_string(index=False)
    )

    train_df = df[df["cat"].isin(["A-human-pre", "B-human-post", "C-ai-co"])]
    X = train_df[features]
    y = train_df["cat"].apply(
        lambda x: 1 if x in ["A-human-pre", "B-human-post"] else 0
    )

    clf = make_pipeline(
        StandardScaler(), RandomForestClassifier(n_estimators=100, random_state=42)
    )
    cv_scores = cross_val_score(
        clf,
        X,
        y,
        cv=StratifiedKFold(n_splits=5, shuffle=True, random_state=42),
        scoring="accuracy",
    )
    print(
        f"\nClassifier CV Accuracy (Human vs AI-assoc): {cv_scores.mean():.3f} +/- {cv_scores.std():.3f}"
    )

    clf.fit(X, y)

    print("\nTarget Pages:")
    for root, _, files in os.walk("target-pages"):
        for file in sorted(files):
            if file.endswith(".txt"):
                path = os.path.join(root, file)
                with open(path, "r", encoding="utf-8") as f:
                    content = f.read()
                feats = analyze_text(content)
                if not feats:
                    continue
                row = pd.DataFrame([feats])[features]
                prob = clf.predict_proba(row)[0]
                print(f"{file:40s} Prob Human: {prob[1]:.2f}")


if __name__ == "__main__":
    main()
