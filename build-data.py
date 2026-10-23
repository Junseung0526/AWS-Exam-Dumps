#!/usr/bin/env python3
"""Merge data/m*.json into data.js (loaded via <script>, so index.html works from file://) and validate."""
import json, glob, os, collections

here = os.path.dirname(os.path.abspath(__file__))
modules, questions, cards, briefs = {}, [], [], []
for path in sorted(glob.glob(os.path.join(here, "data", "m*.json"))):
    d = json.load(open(path, encoding="utf-8"))
    for m in d["modules"]:
        modules[m["module"]] = m["title"]
    mods = [m["module"] for m in d["modules"]]
    if d.get("brief"):
        briefs.append({"modules": mods, "text": d["brief"]})
    for c in d.get("cards", []):
        c.setdefault("module", mods[-1])
        cards.append(c)
    questions += d["questions"]

ids = set()
for q in questions:
    qid = q["id"]
    assert qid not in ids, f"duplicate id {qid}"
    ids.add(qid)
    assert q["difficulty"] in ("basic", "advanced"), qid
    assert q["choose"] == len(q["answer"]) == len(set(q["answer"])), qid
    assert 4 <= len(q["options"]) <= 5, qid
    assert all(0 <= a < len(q["options"]) for a in q["answer"]), qid
    assert len(q["optionNotes"]) == len(q["options"]), qid
    assert q["module"] in modules, qid
    text = q["scenario"] + q["requirement"] + q["question"]
    q["keywords"] = [k for k in q.get("keywords", []) if k and k in text]  # drop non-verbatim keywords

with open(os.path.join(here, "data.js"), "w", encoding="utf-8") as f:
    f.write("window.QB=")
    json.dump({"modules": modules, "questions": questions, "cards": cards, "briefs": briefs}, f, ensure_ascii=False)
    f.write(";\n")

n = len(questions)
diff = collections.Counter(q["difficulty"] for q in questions)
multi = sum(q["choose"] > 1 for q in questions)
five = sum(len(q["options"]) == 5 for q in questions)
waf = sum(bool(q.get("waf")) for q in questions)
print(f"{n} questions | basic {diff['basic']} / advanced {diff['advanced']} | multi {multi} ({multi*100//max(n,1)}%) | 5-option {five} | WAF {waf} | cards {len(cards)}")
print("per module:", dict(sorted(collections.Counter(q["module"] for q in questions).items())))
