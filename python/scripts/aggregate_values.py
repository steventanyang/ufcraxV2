import requests
import pandas as pd
from bs4 import BeautifulSoup

data = pd.read_csv('../results/new_final.csv')

data['Value'] = data.apply(lambda row: int(row["KO/TKO"]) + int(row["Submission"]) + int(row["Unanimous Decision"]) + int(row["Majority Decision"]) + int(row["Split Decision"]) + int(row["No Contest"]) + int(row["StrikeBonus"]) + int(row["5roundBonus"]) + int(row["Losses"]), axis=1)

sorted = data.sort_values(by='Value', ascending=False)

sorted.to_csv('../results/final_values.csv', index=False)
