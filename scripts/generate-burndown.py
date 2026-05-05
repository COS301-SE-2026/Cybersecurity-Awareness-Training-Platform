#!/usr/bin/env python3

from __future__ import annotations

import csv
import html
import json
import os
import re
import sys
import urllib.error
import urllib.request
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from typing import Any

API = "https://api.github.com"
SPRINT_RE = re.compile(r"^Sprint (\d+) \(Demo ([1-4])\)$")
START_RE = re.compile(r"^Start:\s*(\S+)\s*$", re.MULTILINE)
END_RE = re.compile(r"^End:\s*(\S+)\s*$", re.MULTILINE)

VALID_POINTS = {1, 2, 3, 5}

THEME_COLOURS = {
    "light": {
        "background": "#ffffff",
        "axis": "#3A3A3A",
        "text": "#3A3A3A",
        "grid": "#EEDEFF",
        "remaining": "#8400FF",
        "ideal": "#B37DFF",
    },
    "dark": {
        "background": "#090054",
        "axis": "#EEDEFF",
        "text": "#EEDEFF",
        "grid": "#3A3A3A",
        "remaining": "#D6B3FF",
        "ideal": "#B37DFF",
    },
}

HEADING_FONT = "Jost, Arial, Helvetica, sans-serif"
BODY_FONT = "Overpass, Arial, Helvetica, sans-serif"


ROOT = Path(__file__).resolve().parents[1]


def get_env(name: str, default: str | None = None) -> str:
    value = os.environ.get(name, default)
    if value is None or value == "":
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value


TOKEN = os.environ.get("GITHUB_TOKEN")
REPO = get_env("REPOSITORY")
README_PATH = Path(os.environ.get("README_PATH", "README.md"))
SHOW_PROJECT_BURNDOWN = os.environ.get("SHOW_PROJECT_BURNDOWN", "true").lower() == "true"
ASSET_BRANCH = os.environ.get("BURNDOWN_ASSET_BRANCH", "automation/burndown-assets")
RAW_ASSET_BASE = f"https://raw.githubusercontent.com/{REPO}/{ASSET_BRANCH}/docs/burndown"


def request_json(url: str, body: dict[str, Any] | None = None) -> Any:
    # Input
    headers = {
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if TOKEN:
        headers["Authorization"] = f"Bearer {TOKEN}"
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers=headers)

    try:
        # Processing
        with urllib.request.urlopen(req) as res:
            return json.loads(res.read().decode())
    except urllib.error.HTTPError as error:
        detail = error.read().decode(errors="replace")
        raise RuntimeError(f"GitHub API request failed: {error.code} {error.reason}\n{detail}") from error



def paged_rest(path: str) -> list[dict[str, Any]]:
    # Input
    i_page = 1
    arr_rows: list[dict[str, Any]] = []

    # Processing
    while True:
        url = f"{API}{path}{'&' if '?' in path else '?'}per_page=100&page={i_page}"
        rows = request_json(url)
        if not isinstance(rows, list):
            raise RuntimeError(f"Expected list response from REST endpoint: {path}")

        arr_rows.extend(rows)
        if len(rows) < 100:
            return arr_rows
        i_page += 1



def parse_story_points_line(line: str) -> int | None:
    cleaned_line = line.strip()

    if cleaned_line.startswith("- ") or cleaned_line.startswith("* "):
        cleaned_line = cleaned_line[2:].strip()

    cleaned_line = cleaned_line.replace("**", "").strip()

    if not cleaned_line.lower().startswith("story points"):
        return None

    point_text = cleaned_line[len("Story Points") :].strip()
    if point_text.startswith(":"):
        point_text = point_text[1:].strip()

    if not point_text:
        return None

    point_value = point_text.split()[0].strip(".,;")
    if not point_value.isdigit():
        return None

    return int(point_value)


def extract_story_points_from_body(body: str) -> int | None:
    for line in body.splitlines():
        points = parse_story_points_line(line)
        if points is not None:
            return points

    return None


def extract_story_points(issue: dict[str, Any], milestone_title: str, warnings: list[str]) -> int | None:
    # Input
    body = issue.get("body") or ""
    points = extract_story_points_from_body(body)

    # Validation
    if points is None:
        warnings.append(
            f"- #{issue['number']} {issue['title']} is in `{milestone_title}` but is missing "
            "`Story Points: <value>` in the issue body."
        )
        return None

    if points not in VALID_POINTS:
        warnings.append(
            f"- #{issue['number']} {issue['title']} has invalid story point value `{points}`. "
            "Allowed values: 1, 2, 3, 5."
        )
        return None

    return points


def parse_github_datetime(value: str) -> date:
    return datetime.fromisoformat(value.replace("Z", "+00:00")).date()


def parse_optional_date(value: str | None) -> date | None:
    if not value:
        return None
    return parse_github_datetime(value)


def parse_description_date(label: str, value: str, milestone_title: str, warnings: list[str]) -> date | None:
    try:
        return date.fromisoformat(value)
    except ValueError:
        warnings.append(f"- {milestone_title} has an invalid `{label}:` date `{value}`. Expected YYYY-MM-DD.")
        return None


def daterange(start: date, end: date):
    day = start
    while day <= end:
        yield day
        day += timedelta(days=1)


def resolve_sprint_dates(milestone: dict[str, Any], warnings: list[str]) -> tuple[date | None, date | None]:
    # Input
    title = milestone["title"]
    description = milestone.get("description") or ""

    # Processing
    start_match = START_RE.search(description)
    end_match = END_RE.search(description)
    due_date = parse_optional_date(milestone.get("due_on"))

    start_date = (
        parse_description_date("Start", start_match.group(1), title, warnings)
        if start_match
        else None
    )
    description_end = (
        parse_description_date("End", end_match.group(1), title, warnings)
        if end_match
        else None
    )

    if start_date is None and not start_match:
        warnings.append(f"- {title} is missing `Start: YYYY-MM-DD` in the milestone description.")

    # Validation
    if due_date and description_end and due_date != description_end:
        warnings.append(
            f"- {title} has an `End:` date ({description_end}) that differs from the milestone due date ({due_date}). "
            "Using the milestone due date."
        )

    end_date = due_date or description_end
    if end_date is None:
        warnings.append(f"- {title} is missing a milestone due date or `End: YYYY-MM-DD` in the description.")

    if start_date and end_date and start_date > end_date:
        warnings.append(f"- {title} has a start date after the end date.")
        return None, None

    return start_date, end_date


def sprint_series(issues: list[dict[str, Any]], start: date, end: date, as_of: date | None = None) -> list[dict[str, Any]]:
    # Input
    total = sum(issue["points"] for issue in issues)
    rows: list[dict[str, Any]] = []

    # Processing
    effective_end = min(end, as_of) if as_of else end
    for day in daterange(start, effective_end):
        remaining = sum(
            issue["points"]
            for issue in issues
            if issue.get("closed_date") is None or issue["closed_date"] > day
        )
        ideal_days = max((end - start).days, 1)
        elapsed = min(max((day - start).days, 0), ideal_days)
        ideal = round(total * (1 - elapsed / ideal_days), 2)
        rows.append({"date": str(day), "remaining": remaining, "ideal": ideal})

    if not rows:
        rows.append({"date": str(start), "remaining": total, "ideal": float(total)})

    return rows


def project_series(sprints: list[dict[str, Any]], as_of: date | None = None) -> list[dict[str, Any]]:
    if not sprints:
        return []

    # Processing
    start = min(sprint["start"] for sprint in sprints)
    end = max(sprint["end"] for sprint in sprints)
    issues = [issue for sprint in sprints for issue in sprint["issues"]]
    return sprint_series(issues, start, end, as_of=as_of)


def write_csv(path: Path, rows: list[dict[str, Any]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["date", "remaining", "ideal"])
        writer.writeheader()
        writer.writerows(rows)


def write_json(path: Path, payload: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, default=str) + "\n")


def relative_days_late(closed_date: date, end_date: date) -> int:
    return (closed_date - end_date).days


def warn_if_issue_closed_after_sprint_end(issue: dict[str, Any], milestone_title: str, end_date: date, warnings: list[str]) -> None:
    # Validation
    closed_date = issue.get("closed_date")
    if closed_date is None or closed_date <= end_date:
        return

    days_late = relative_days_late(closed_date, end_date)
    day_word = "day" if days_late == 1 else "days"
    warnings.append(
        f"- #{issue['number']} {issue['title']} closed {days_late} {day_word} after {milestone_title} ended."
    )


def choose_x_tick_step(row_count: int) -> int:
    if row_count <= 10:
        return 1
    if row_count <= 20:
        return 2
    if row_count <= 35:
        return 5
    if row_count <= 70:
        return 7
    return 14


def y_tick_values(max_y: float) -> list[int]:
    if max_y <= 5:
        step = 1
    elif max_y <= 20:
        step = 5
    elif max_y <= 50:
        step = 10
    else:
        step = 25

    top = int(((max_y + step - 1) // step) * step)
    return list(range(0, top + step, step))


def format_chart_date(value: str) -> str:
    parsed = date.fromisoformat(value)
    return parsed.strftime("%d %b").lstrip("0")


def write_svg(path: Path, title: str, rows: list[dict[str, Any]], theme: str = "light") -> None:
    # Input
    path.parent.mkdir(parents=True, exist_ok=True)
    colours = THEME_COLOURS.get(theme, THEME_COLOURS["light"])
    width, height = 900, 420
    left, right, top, bottom = 70, 30, 55, 65
    data_max_y = max([float(row["remaining"]) for row in rows] + [float(row["ideal"]) for row in rows] + [1.0])
    y_ticks = y_tick_values(data_max_y)
    max_y = float(max(y_ticks))
    plot_w = width - left - right
    plot_h = height - top - bottom

    def xy(idx: int, value: float) -> str:
        x = left + (idx / max(len(rows) - 1, 1)) * plot_w
        y = top + plot_h - (value / max_y) * plot_h
        return f"{x:.1f},{y:.1f}"

    # Processing: Y axis ticks and labels
    y_axis_ticks = "\n".join(
        f'<line x1="{left-5}" y1="{top + plot_h - (tick / max_y) * plot_h:.1f}" x2="{width-right}" y2="{top + plot_h - (tick / max_y) * plot_h:.1f}" stroke="{colours["grid"]}"/>'
        f'<text x="{left-12}" y="{top + plot_h - (tick / max_y) * plot_h + 4:.1f}" font-family="{BODY_FONT}" font-size="12" text-anchor="end" fill="{colours["text"]}">{tick}</text>'
        for tick in y_ticks
    )

    # Processing: X axis ticks and labels
    x_step = choose_x_tick_step(len(rows))
    x_tick_indices = list(range(0, len(rows), x_step))
    if len(rows) - 1 not in x_tick_indices:
        x_tick_indices.append(len(rows) - 1)
    x_axis_ticks = "\n".join(
        f'<line x1="{left + (idx / max(len(rows) - 1, 1)) * plot_w:.1f}" y1="{height-bottom}" x2="{left + (idx / max(len(rows) - 1, 1)) * plot_w:.1f}" y2="{height-bottom+5}" stroke="{colours["axis"]}"/>'
        f'<text x="{left + (idx / max(len(rows) - 1, 1)) * plot_w:.1f}" y="{height-38}" font-family="{BODY_FONT}" font-size="12" text-anchor="middle" fill="{colours["text"]}">{format_chart_date(rows[idx]["date"])}</text>'
        for idx in x_tick_indices
    )

    remaining = " ".join(xy(i, float(row["remaining"])) for i, row in enumerate(rows))
    ideal = " ".join(xy(i, float(row["ideal"])) for i, row in enumerate(rows))
    escaped_title = html.escape(title)

    # Output
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-labelledby="title desc">
<title id="title">{escaped_title}</title>
<desc id="desc">Burndown chart showing remaining story points and ideal remaining story points over time.</desc>
<rect width="100%" height="100%" fill="{colours["background"]}"/>
<text x="{left}" y="32" font-family="{HEADING_FONT}" font-size="22" font-weight="700" fill="{colours["text"]}">{escaped_title}</text>
{y_axis_ticks}
{x_axis_ticks}
<line x1="{left}" y1="{top}" x2="{left}" y2="{height-bottom}" stroke="{colours["axis"]}"/>
<line x1="{left}" y1="{height-bottom}" x2="{width-right}" y2="{height-bottom}" stroke="{colours["axis"]}"/>
<text x="18" y="{top + plot_h / 2:.1f}" font-family="{BODY_FONT}" font-size="13" text-anchor="middle" transform="rotate(-90 18 {top + plot_h / 2:.1f})" fill="{colours["text"]}">Story points remaining</text>
<text x="{left + plot_w / 2:.1f}" y="{height-12}" font-family="{BODY_FONT}" font-size="13" text-anchor="middle" fill="{colours["text"]}">Sprint timeline</text>
<polyline points="{ideal}" fill="none" stroke="{colours["ideal"]}" stroke-width="3" stroke-dasharray="8 6"/>
<polyline points="{remaining}" fill="none" stroke="{colours["remaining"]}" stroke-width="4"/>
<line x1="{width-right-260}" y1="{top+20}" x2="{width-right-225}" y2="{top+20}" stroke="{colours["remaining"]}" stroke-width="4"/>
<text x="{width-right-215}" y="{top+25}" font-family="{BODY_FONT}" font-size="13" fill="{colours["text"]}">Remaining work</text>
<line x1="{width-right-260}" y1="{top+42}" x2="{width-right-225}" y2="{top+42}" stroke="{colours["ideal"]}" stroke-width="3" stroke-dasharray="8 6"/>
<text x="{width-right-215}" y="{top+47}" font-family="{BODY_FONT}" font-size="13" fill="{colours["text"]}">Ideal burndown</text>
</svg>
"""
    path.write_text(svg)


def write_themed_svgs(path_without_suffix: Path, title: str, rows: list[dict[str, Any]]) -> dict[str, str]:
    light_path = path_without_suffix.with_name(f"{path_without_suffix.name}-light.svg")
    dark_path = path_without_suffix.with_name(f"{path_without_suffix.name}-dark.svg")
    write_svg(light_path, title, rows, theme="light")
    write_svg(dark_path, title, rows, theme="dark")
    return {"light": str(light_path.relative_to(ROOT)), "dark": str(dark_path.relative_to(ROOT))}


def update_readme(warnings: list[str]) -> None:
    # Input
    readme = ROOT / README_PATH

    # Validation
    if not readme.exists():
        warnings.append(f"- README file `{README_PATH}` was not found. Burndown chart links were not injected.")
        return

    # Processing
    text = readme.read_text()
    start = "<!-- BURNDOWN:START -->"
    end = "<!-- BURNDOWN:END -->"
    latest_sprint_block = f"""
### Latest Sprint Burndown

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="{RAW_ASSET_BASE}/latest-sprint-burndown-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="{RAW_ASSET_BASE}/latest-sprint-burndown-light.svg">
  <img alt="Latest Sprint Burndown" src="{RAW_ASSET_BASE}/latest-sprint-burndown-light.svg">
</picture>
"""

    project_block = ""
    if SHOW_PROJECT_BURNDOWN:
        project_block = f"""
### Project Burndown

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="{RAW_ASSET_BASE}/project-burndown-dark.svg">
  <source media="(prefers-color-scheme: light)" srcset="{RAW_ASSET_BASE}/project-burndown-light.svg">
  <img alt="Project Burndown" src="{RAW_ASSET_BASE}/project-burndown-light.svg">
</picture>
"""

    block = f"""{start}
{latest_sprint_block}
{project_block}
[Burndown process](docs/demo1/burndown/PROCESS.md)

{end}"""

    if start not in text or end not in text:
        warnings.append(
            f"- README file `{README_PATH}` does not contain both burndown markers. "
            "Expected `<!-- BURNDOWN:START -->` and `<!-- BURNDOWN:END -->`. Appending a new burndown section."
        )
        text += f"\n\n## Burndown Charts\n\n{block}\n"
    else:
        text = re.sub(f"{re.escape(start)}.*?{re.escape(end)}", block, text, flags=re.DOTALL)

    readme.write_text(text)


def warn_about_non_sprint_milestones(milestones: list[dict[str, Any]], warnings: list[str]) -> None:
    for milestone in milestones:
        if not SPRINT_RE.match(milestone["title"]):
            warnings.append(
                f"- Milestone `{milestone['title']}` does not follow the required format `Sprint <number> (Demo <1-4>)`."
            )


def build_issue_from_raw(issue: dict[str, Any], point_value: int) -> dict[str, Any]:
    return {
        "number": issue["number"],
        "title": issue["title"],
        "points": int(point_value),
        "state": issue["state"],
        "closed_date": parse_github_datetime(issue["closed_at"]) if issue["closed_at"] else None,
    }


def collect_sprint_issues(
    raw_issues: list[dict[str, Any]],
    milestone_title: str,
    end_date: date,
    warnings: list[str],
) -> list[dict[str, Any]]:
    # Input
    issues: list[dict[str, Any]] = []

    # Processing
    for raw_issue in raw_issues:
        if "pull_request" in raw_issue:
            continue

        point_value = extract_story_points(raw_issue, milestone_title, warnings)
        if point_value is None:
            continue

        issue = build_issue_from_raw(raw_issue, point_value)
        warn_if_issue_closed_after_sprint_end(issue, milestone_title, end_date, warnings)
        issues.append(issue)

    return issues


def write_sprint_outputs(
    sprint_no: int,
    demo_no: int,
    milestone: dict[str, Any],
    start_date: date,
    end_date: date,
    issues: list[dict[str, Any]],
    today: date,
) -> dict[str, Any]:
    # Processing
    rows = sprint_series(issues, start_date, end_date, as_of=today)
    base = ROOT / f"docs/demo{demo_no}/burndown"
    name = f"sprint-{sprint_no}-burndown"

    # Output
    write_csv(base / f"{name}.csv", rows)
    write_json(
        base / f"{name}.json",
        {
            "milestone": milestone["title"],
            "start": str(start_date),
            "end": str(end_date),
            "issues": issues,
            "series": rows,
        },
    )
    chart_paths = write_themed_svgs(base / name, f"{milestone['title']} Burndown", rows)

    return {
        "sprint_no": sprint_no,
        "demo_no": demo_no,
        "milestone": milestone["title"],
        "start": start_date,
        "end": end_date,
        "issues": issues,
        "charts": chart_paths,
    }


def process_sprint_milestone(
    milestone: dict[str, Any],
    owner: str,
    repo: str,
    today: date,
    warnings: list[str],
) -> dict[str, Any] | None:
    # Validation
    match = SPRINT_RE.match(milestone["title"])
    if not match:
        return None

    # Input
    sprint_no = int(match.group(1))
    demo_no = int(match.group(2))
    start_date, end_date = resolve_sprint_dates(milestone, warnings)
    if start_date is None or end_date is None:
        return None

    # Processing
    raw_issues = paged_rest(f"/repos/{owner}/{repo}/issues?state=all&milestone={milestone['number']}")
    issues = collect_sprint_issues(raw_issues, milestone["title"], end_date, warnings)
    return write_sprint_outputs(sprint_no, demo_no, milestone, start_date, end_date, issues, today)


def write_project_outputs(generated_sprints: list[dict[str, Any]], today: date, warnings: list[str]) -> None:
    # Processing
    project_rows = project_series(generated_sprints, as_of=today)

    # Output
    write_csv(ROOT / "docs/burndown/project-burndown.csv", project_rows)
    write_json(
        ROOT / "docs/burndown/project-burndown.json",
        {
            "sprints": [
                {
                    "sprint_no": sprint["sprint_no"],
                    "demo_no": sprint["demo_no"],
                    "milestone": sprint["milestone"],
                    "start": str(sprint["start"]),
                    "end": str(sprint["end"]),
                    "issues": sprint["issues"],
                }
                for sprint in generated_sprints
            ],
            "series": project_rows,
        },
    )
    if SHOW_PROJECT_BURNDOWN:
        write_themed_svgs(ROOT / "docs/burndown/project-burndown", "Project Burndown", project_rows)

    latest = max(generated_sprints, key=lambda sprint: (sprint["end"], sprint["demo_no"], sprint["sprint_no"]))
    latest_rows = sprint_series(latest["issues"], latest["start"], latest["end"], as_of=today)
    write_csv(ROOT / "docs/burndown/latest-sprint-burndown.csv", latest_rows)
    write_json(
        ROOT / "docs/burndown/latest-sprint-burndown.json",
        {
            "sprint_no": latest["sprint_no"],
            "demo_no": latest["demo_no"],
            "milestone": latest["milestone"],
            "start": str(latest["start"]),
            "end": str(latest["end"]),
            "issues": latest["issues"],
            "series": latest_rows,
        },
    )
    write_themed_svgs(ROOT / "docs/burndown/latest-sprint-burndown", f"{latest['milestone']} Burndown", latest_rows)
    update_readme(warnings)


def main() -> int:
    # Input
    if "/" not in REPO:
        raise RuntimeError("REPOSITORY must use the format `owner/repo`.")

    owner, repo = REPO.split("/", 1)
    run_datetime = datetime.now(timezone.utc)
    today = run_datetime.date()
    milestones = paged_rest(f"/repos/{owner}/{repo}/milestones?state=all")
    warnings: list[str] = []
    generated_sprints: list[dict[str, Any]] = []

    # Validation
    warn_about_non_sprint_milestones(milestones, warnings)

    # Processing
    for milestone in milestones:
        generated_sprint = process_sprint_milestone(milestone, owner, repo, today, warnings)
        if generated_sprint is not None:
            generated_sprints.append(generated_sprint)

    if generated_sprints:
        write_project_outputs(generated_sprints, today, warnings)

    # Output
    report = ROOT / "docs/burndown/burndown-check-report.md"
    report.parent.mkdir(parents=True, exist_ok=True)
    report.write_text(
        "# Burndown Check Report\n\n"
        + f"Last run: {run_datetime.strftime('%Y-%m-%d %H:%M:%S UTC')}\n\n"
        + ("\n".join(warnings) if warnings else "No issues found.")
        + "\n"
    )

    for warning in warnings:
        print(warning, file=sys.stderr)

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as error:
        print(f"generate-burndown.py failed: {error}", file=sys.stderr)
        raise SystemExit(1)
