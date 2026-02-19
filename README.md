# WWU Salary + Faculty Specialty Explorer

Interactive website that combines **public Washington State employee 
salary data** with **WWU faculty profile information** (department + 
specialty areas).

The site provides:

- Searchable faculty table
- Salary filtering
- Year filtering
- Salary distribution histogram
- Average salary by department chart

## Live Website

GitHub Pages deployment:

https://chelseamharmon.github.io/wwu-salary-site/

## Project Structure

wwu-salary-site/
├── public/
│ └── data/
│ └── faculty.json # data consumed by React frontend
│
├── src/
│ └── App.jsx # main interactive UI
│
├── scripts/
│ ├── download_wa_salary.sh # helper for downloading WA salary data
│ ├── build_from_wa_salary.py # ingest + transform pipeline
│ └── build_faculty_dataset.py # WWU scraper (dept + specialty)
│
├── package.json
└── README.md

## Data Sources

### 1. Washington State Employee Salary Data (Official)

Source: WA Office of Financial Management / LEAP

- Official statewide salary dataset
- Used as salary source-of-truth
- Downloaded via emailed link from LEAP

### 2. WWU Faculty Pages

Used to enrich salary records with:

- department
- specialty / research interests
- profile URLs

## Local Development

Start the website locally:

```bash
npm install
npm run dev

