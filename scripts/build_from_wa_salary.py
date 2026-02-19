from __future__ import annotations

from pathlib import Path

RAW_PATH = Path("data/raw/wa_salary_download")

def main() -> None:
    if not RAW_PATH.exists():
        raise FileNotFoundError(f"Missing {RAW_PATH}. Run the download script first.")

    # Next step (when you paste the file type):
    # - if ZIP: unzip to data/raw/wa_salary/
    # - if CSV: read with pandas
    # - if XLSX: read with pandas.read_excel
    #
    # Then:
    # - filter to Western Washington University (or agency code for WWU)
    # - select fields: name, year, salary, title, etc.
    # - write public/data/faculty.json
    raise RuntimeError(
        "Download file present. Now run: `file data/raw/wa_salary_download` and paste output here."
    )

if __name__ == "__main__":
    main()
