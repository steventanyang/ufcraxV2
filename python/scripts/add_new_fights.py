import requests
import pandas as pd
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor



fights = pd.read_csv('../data/fights.csv') # csv of fight urls
fighters = pd.read_csv('../data/all_fighters.csv') # csv of all fighters

result = []

def job(row_data):

    _, row = row_data
    url = row['fighter_url']

    print(row['fighter_f_name'] + " " + row["fighter_l_name"])
    print(row['fighter_url'])

    try :
        page = requests.get(url)
        soup = BeautifulSoup(page.content, 'html.parser')

        fight_urls = soup.find_all('tr', class_="b-fight-details__table-row__hover")
        links = [tr.get('data-link') for tr in fight_urls]

        for link in links :
            exists = link in fights['fight_url'].values
            if not exists :
                print("*NEW" + link)
                result.append(link)

        print("__________")

    except :
        print("failed")


with ThreadPoolExecutor(max_workers=10) as executor:
    executor.map(job, fighters.iterrows())


print("________________")
print("NEW MATCHES: " + str(len(result)))

for item in result :
    print(item)

new_urls_df = pd.DataFrame(result, columns=['fight_url'])

updated_df = fights._append(new_urls_df, ignore_index=True)

updated_df.to_csv('../results/all_fights.csv', index=False)

# update one old as well
updated_df.to_csv('../data/fights.csv', index=False)




