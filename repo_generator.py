"""Create a local Git repository for an exported contribution artwork."""

import argparse
from datetime import date, datetime, time, timedelta, timezone
import json
import os
from pathlib import Path
import subprocess
from tempfile import TemporaryDirectory


def read_pattern(path):
    pattern = json.loads(path.read_text(encoding="utf-8-sig"))
    if not isinstance(pattern, dict) or pattern.get("version") != 1:
        raise ValueError("Expected a version 1 contribution-canvas JSON file.")
    year = pattern.get("year")
    days = pattern.get("commits")
    if type(year) is not int or not 2008 <= year <= 9999 or not isinstance(days, dict):
        raise ValueError("Expected a year and a commits object.")
    result = []
    for value, count in days.items():
        day = date.fromisoformat(value)
        if value != day.isoformat() or day.year != year:
            raise ValueError(f"Date {value!r} must be in {year} and use YYYY-MM-DD.")
        if type(count) is not int or not 1 <= count <= 100:
            raise ValueError(f"Commit count for {value} must be an integer from 1 to 100.")
        result.append((day, count))
    if not result:
        raise ValueError("The design is empty. Draw at least one square.")
    return sorted(result)


def identity_value(value):
    value = value.strip()
    if not value or any(c in "<>" or ord(c) < 32 or ord(c) == 127 for c in value):
        raise argparse.ArgumentTypeError("Git identity fields cannot be empty or contain control characters or angle brackets.")
    return value


def import_stream(days, name, email):
    readme = (
        "# Contribution Canvas\n\n"
        "This repository contains synthetic commits generated for GitHub contribution graph artwork.\n"
    ).encode("utf-8")
    china_time = timezone(timedelta(hours=8))
    stream = bytearray()
    for day, count in days:
        stamp = int(datetime.combine(day, time(12), china_time).timestamp())
        for i in range(1, count + 1):
            message = f"Contribution art: {day} ({i}/{count})".encode("utf-8")
            first = not stream
            stream.extend(f"commit refs/heads/main\ncommitter {name} <{email}> {stamp} +0800\ndata {len(message)}\n".encode("utf-8"))
            stream.extend(message + b"\n")
            if first:
                stream.extend(f"M 100644 inline README.md\ndata {len(readme)}\n".encode("ascii"))
                stream.extend(readme + b"\n")
            stream.extend(b"\n")
    stream.extend(b"done\n")
    return stream


def generate(destination, days, name, email):
    destination = destination.absolute()
    if os.path.lexists(destination):
        raise ValueError(f"{destination} already exists. Choose a new directory.")
    if not destination.parent.is_dir():
        raise ValueError("The output directory's parent must already exist.")
    env = {key: value for key, value in os.environ.items() if not key.upper().startswith("GIT_")}

    def git(path, *args, input_data=None):
        subprocess.run(
            ["git", "-C", str(path), *args],
            env=env, input=input_data, check=True, capture_output=True,
        )

    with TemporaryDirectory(prefix=".contribution-canvas-", dir=destination.parent) as scratch:
        repo = Path(scratch) / "repo"
        repo.mkdir()
        git(repo, "init", "--initial-branch=main", "--template=")
        git(repo, "fast-import", "--quiet", "--done", input_data=import_stream(days, name, email))
        git(repo, "reset", "--hard", "main")
        # Reserve the final path exclusively before moving the finished repository.
        destination.mkdir()
        try:
            (repo / "README.md").rename(destination / "README.md")
            (repo / ".git").rename(destination / ".git")
        except OSError:
            (destination / "README.md").unlink(missing_ok=True)
            destination.rmdir()
            raise


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("pattern", type=Path, help="JSON file exported by the editor")
    parser.add_argument("--dry-run", action="store_true", help="Show the date range and commit count")
    parser.add_argument("--output", type=Path, help="A new directory for the generated repository")
    parser.add_argument("--name", type=identity_value, help="Git author name")
    parser.add_argument("--email", type=identity_value, help="Email associated with your GitHub account")
    args = parser.parse_args()
    try:
        days = read_pattern(args.pattern)
        print(f"{sum(count for _, count in days)} commits on {len(days)} days ({days[0][0]} to {days[-1][0]}).")
        if args.dry_run:
            return
        if args.output is None or args.name is None or args.email is None:
            parser.error("provide --output, --name and --email to generate, or use --dry-run")
        generate(args.output, days, args.name, args.email)
        print(f"Created {args.output.absolute()} on branch main.")
    except subprocess.CalledProcessError as error:
        parser.exit(1, f"Git failed: {error.stderr.decode('utf-8', errors='replace').strip()}\n")
    except (OSError, ValueError) as error:
        parser.exit(1, f"{error}\n")


if __name__ == "__main__":
    main()
