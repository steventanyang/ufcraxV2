import requests
import pandas as pd
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from collections import defaultdict

# TODO: make this more efficient + cleaner

# fights = pd.read_csv('ufc_fight_stat_data.csv')
fights = pd.read_csv('../results/test.csv')
fighters = pd.read_csv('../data/fighters.csv')
result = {}
lerror = []
wlerror = []
id = 0

# fights = fights.drop_duplicates(subset='fight_id', keep='first')
# edge cases -> fighter has two fights on same day

print(f"Loaded {len(fights)} fights from CSV")
if len(fights) == 0:
    print("Warning: No fights loaded from CSV file")
    exit()

def job(row_data):
    index, row = row_data
    url = row['fight_url']
    print(f"\nProcessing fight {index}: {url}")

    try:
        page = requests.get(url, timeout=10)
        if page.status_code != 200:
            print(f"Error: HTTP {page.status_code} for {url}")
            lerror.append(url)
            return
        soup = BeautifulSoup(page.content, 'html.parser')


        event_rax = defaultdict(int) # stores date -> rax for each fighter

        # get event date
        # _____________________
        event_link = soup.find('h2', class_='b-content__title').find('a')
        if event_link:
            new_url = event_link['href']
            print("Following link to:", new_url)
            new_page = requests.get(new_url, timeout=10)
            new_soup = BeautifulSoup(new_page.content, 'html.parser')
    
            # Find the date in the list box
            date_item = new_soup.find('li', class_='b-list__box-list-item')
            if date_item:
                raw_date = date_item.text.strip().replace('Date:', '').strip()
                formatted_date = datetime.strptime(raw_date, '%B %d, %Y').strftime('%Y-%m-%d')
                print("Event date:", formatted_date)
            else:
                print("ERROR: Date not found")
        else:
            print("ERROR: Link not found")
    
        try :
            # strikes
            strike_diff = 0
            parent_strike = soup.find('tbody', class_="b-fight-details__table-body")
            fighter_names_strike = parent_strike.find_all('a', class_="b-link_style_black")

            top = fighter_names_strike[0].get_text(strip=True)
            bottom = fighter_names_strike[1].get_text(strip=True)

            # print(top)
            # print(bottom)

            strike_num = parent_strike.find_all('td', class_="b-fight-details__table-col")
            # print(strike_num[2])

            top_strikes = strike_num[2].find_all('p', class_="b-fight-details__table-text")[0].get_text(strip=True)
            bottom_strikes = strike_num[2].find_all('p', class_="b-fight-details__table-text")[1].get_text(strip=True)

            top_s_final = top_strikes.split(" ")[0]
            bottom_s_final = bottom_strikes.split(" ")[0]

            # print("top final: " + top_s_final)
            # print("bottom final: " + bottom_s_final)

            strike_diff = abs(int(top_s_final) - int(bottom_s_final))

            if int(top_s_final) > int(bottom_s_final) :
                striker = top
            else :
                striker = bottom
        except :
            striker = "none"

        # print(striker)
        # print(strike_diff)

        # rounds
        rounds = ""
        parent_round = soup.find('p', class_="b-fight-details__text")
        round_i_tags = parent_round.find_all('i', class_="b-fight-details__text-item")
        for i in round_i_tags :
            if i.find('i', class_="b-fight-details__label").get_text(strip=True) == "Time format:" :
                rounds = i.get_text(strip=True)

        n = rounds.split(':')[1]
        final = n[:1]

        # print(rounds)
        # print(final)

        # KO/TKO , Submission , Decision - Unanimous , Decision - Majority , Decision - Split , No Contest 

        #winner, loser
        names = soup.find_all('div', class_='b-fight-details__person')
        winner = ""
        loser = ""
        draw = False
        nocontest = False

        for f in names :
            win_tag = f.find('i', class_='b-fight-details__person-status')

            if win_tag.get_text(strip=True) == 'W' :

                winner_raw = f.find('a', class_="b-fight-details__person-link")
                winner = winner_raw.text.strip()
                # print("W" + winner)

            elif win_tag.get_text(strip=True) == 'L' :
                loser_raw = f.find('a', class_="b-fight-details__person-link")
                loser = loser_raw.text.strip()
                # print("L" + loser)

            elif win_tag.get_text(strip=True) == 'D' :

                draw = True
            
            elif win_tag.get_text(strip=True) == "NC" :

                nocontest = True
            
            else : 
                print("wl error")
                wlerror.append(url)

        #method
        method_parent = soup.find('i', class_="b-fight-details__text-item_first")
        method = method_parent.find_all('i')

        if len(method) > 1:
            m = method[1].get_text(strip=True)
            # print(m)
            if nocontest == True:
                m = "No Contest"
        else:
            m = "Second method tag not found"

        # print("more strikes: " + striker)
        # print("strik_diff: " + str(strike_diff))
        # print("rounds: " + final)
        # print("method: " + m)
        # print("winner: " + winner)
        # print("loser: " + loser)
        # KO/TKO , Submission , Decision - Unanimous , Decision - Majority , Decision - Split , No Contest 

        if nocontest == True :
            # print("OOPS" + " " + winner)
            winner = top
            loser = bottom

        print("winner: " + winner)
        print("loser: " + loser)

        if draw == False :
            if winner in result :
                if m == "KO/TKO" :
                    result[winner]["KO/TKO"] += 100
                elif m == "Submission" :
                    result[winner]["Submission"] += 90
                elif m == "Decision - Unanimous" :
                    result[winner]["Unanimous Decision"] += 80
                elif m == "Decision - Majority" :
                    result[winner]["Majority Decision"] += 75
                elif m == "Decision - Split" :
                    result[winner]["Split Decision"] += 70
                elif m == "No Contest" :
                    result[winner]["No Contest"] += 10

                if final == '5':
                    result[winner]["5roundBonus"] += 25

                if winner == striker :
                    result[winner]["StrikeBonus"] += strike_diff
                print(result[winner])

            else :
                result[winner] = {
                    "name": winner,
                    "KO/TKO": 0,
                    "Submission": 0,
                    "Unanimous Decision": 0,
                    "Majority Decision": 0,
                    "Split Decision": 0,
                    "No Contest": 0,
                    "Losses": 0,
                    "StrikeBonus": 0,
                    "5roundBonus": 0,
                    "fight_history": []
                }

                if m == "KO/TKO":
                    result[winner]["KO/TKO"] += 100
                elif m == "Submission":
                    result[winner]["Submission"] += 90
                elif m == "Decision - Unanimous":
                    result[winner]["Unanimous Decision"] += 80
                elif m == "Decision - Majority":
                    result[winner]["Majority Decision"] += 75
                elif m == "Decision - Split":
                    result[winner]["Split Decision"] += 70
                elif m == "No Contest":
                    result[winner]["No Contest"] += 10

                if final == '5':
                    result[winner]["5roundBonus"] += 25

                if winner == striker :
                    result[winner]["StrikeBonus"] += strike_diff
                print("new")


            if loser in result :
                if m != "No Contest" :
                    result[loser]["Losses"] += 10

                if final == '5':
                    result[loser]["5roundBonus"] += 25

                if loser == striker :
                    result[loser]["StrikeBonus"] += strike_diff

                if m == "No Contest" :
                    result[loser]["No Contest"] += 10

                print(result[loser])

            else :
                result[loser] = {
                    "name": loser,
                    "KO/TKO": 0,
                    "Submission": 0,
                    "Unanimous Decision": 0,
                    "Majority Decision": 0,
                    "Split Decision": 0,
                    "No Contest": 0,
                    "Losses": 0,
                    "StrikeBonus": 0,
                    "5roundBonus": 0,
                    "fight_history": []
                }

                if m != "No Contest" :
                    result[loser]["Losses"] += 10

                if final == '5':
                    result[loser]["5roundBonus"] += 25

                if loser == striker :
                    result[loser]["StrikeBonus"] += strike_diff

                if m == "No Contest" :
                    result[loser]["No Contest"] += 10
                print("new")

        else : #handle draw case
            if top in result :

                if m == "Decision - Unanimous" :
                    result[top]["Unanimous Decision"] += 80
                elif m == "Decision - Majority" :
                    result[top]["Majority Decision"] += 75
                elif m == "Decision - Split" :
                    result[top]["Split Decision"] += 70

                if final == '5':
                    result[top]["5roundBonus"] += 25

                if top == striker :
                    result[top]["StrikeBonus"] += strike_diff
                print(result[top])

            else :
                result[top] = {
                    "name": top,
                    "KO/TKO": 0,
                    "Submission": 0,
                    "Unanimous Decision": 0,
                    "Majority Decision": 0,
                    "Split Decision": 0,
                    "No Contest": 0,
                    "Losses": 0,
                    "StrikeBonus": 0,
                    "5roundBonus": 0,
                    "fight_history": []
                }

                if m == "Decision - Unanimous":
                    result[top]["Unanimous Decision"] += 80
                elif m == "Decision - Majority":
                    result[top]["Majority Decision"] += 75
                elif m == "Decision - Split":
                    result[top]["Split Decision"] += 70

                if final == '5':
                    result[top]["5roundBonus"] += 25

                if top == striker :
                    result[top]["StrikeBonus"] += strike_diff
                print("new")

            if bottom in result :

                if m == "Decision - Unanimous" :
                    result[bottom]["Unanimous Decision"] += 80
                elif m == "Decision - Majority" :
                    result[bottom]["Majority Decision"] += 75
                elif m == "Decision - Split" :
                    result[bottom]["Split Decision"] += 70

                if final == '5':
                    result[bottom]["5roundBonus"] += 25

                if bottom == striker :
                    result[bottom]["StrikeBonus"] += strike_diff
                print(result[bottom])

            else :
                result[bottom] = {
                    "name": bottom,
                    "KO/TKO": 0,
                    "Submission": 0,
                    "Unanimous Decision": 0,
                    "Majority Decision": 0,
                    "Split Decision": 0,
                    "No Contest": 0,
                    "Losses": 0,
                    "StrikeBonus": 0,
                    "5roundBonus": 0,
                    "fight_history": []
                }

                if m == "Decision - Unanimous":
                    result[bottom]["Unanimous Decision"] += 80
                elif m == "Decision - Majority":
                    result[bottom]["Majority Decision"] += 75
                elif m == "Decision - Split":
                    result[bottom]["Split Decision"] += 70

                if final == '5':
                    result[bottom]["5roundBonus"] += 25

                if bottom == striker :
                    result[bottom]["StrikeBonus"] += strike_diff
                print("new")

        # Add to fight history
        if winner in result:
            points = 0
            if m == "KO/TKO":
                points = 100
            elif m == "Submission":
                points = 90
            elif m == "Decision - Unanimous":
                points = 80
            elif m == "Decision - Majority":
                points = 75
            elif m == "Decision - Split":
                points = 70
            elif m == "No Contest":
                points = 10

            # Store the fight details with date
            result[winner]["fight_history"].append({
                "date": formatted_date,
                "opponent": loser,
                "method": m,
                "method_points": points,
                "strike_bonus": strike_diff if winner == striker else 0,
                "round_bonus": 25 if final == '5' else 0,
                "total_points": points + (strike_diff if winner == striker else 0) + (25 if final == '5' else 0)
            })

        if loser in result:
            points = -10 if m != "No Contest" else 0
            result[loser]["Losses"] += abs(points)
            
            strike_bonus = strike_diff if loser == striker else 0
            result[loser]["StrikeBonus"] += strike_bonus
            
            round_bonus = 25 if final == '5' else 0
            result[loser]["5roundBonus"] += round_bonus

            result[loser]["fight_history"].append({
                "date": formatted_date,
                "opponent": winner,
                "method": m,
                "method_points": points,
                "strike_bonus": strike_bonus,
                "round_bonus": round_bonus,
                "total_points": points + strike_bonus + round_bonus
            })

    except requests.RequestException as e:
        print(f"Request error for {url}: {str(e)}")
        lerror.append(url)
    except Exception as e:
        print(f"Unexpected error for {url}: {str(e)}")
        lerror.append(url)
        
    # print(result[winner])
    # print(result[loser])

print("Starting processing...")
with ThreadPoolExecutor(max_workers=2) as executor:
    try:
        list(executor.map(job, fights.iterrows()))
    except Exception as e:
        print(f"Error in thread execution: {str(e)}")

print("Processing complete!")

final_list = []
for f, v in result.items():
    fighter_data = {
        "name": v["name"],
        "KO/TKO": v["KO/TKO"],
        "Submission": v["Submission"],
        "Unanimous Decision": v["Unanimous Decision"],
        "Majority Decision": v["Majority Decision"],
        "Split Decision": v["Split Decision"],
        "No Contest": v["No Contest"],
        "Losses": v["Losses"],
        "StrikeBonus": v["StrikeBonus"],
        "5roundBonus": v["5roundBonus"],
        "fight_history": v["fight_history"]
    }
    final_list.append(fighter_data)

# Save to CSV with fight history
df = pd.DataFrame(final_list)
# Save the main stats
df.drop('fight_history', axis=1).to_csv('../results/new_final.csv', index=False)
# Save the detailed fight history to a separate CSV
fight_history_rows = []
for fighter in final_list:
    for fight in fighter['fight_history']:
        fight_row = {
            'fighter_name': fighter['name'],
            'date': fight['date'],
            'opponent': fight['opponent'],
            'method': fight['method'],
            'method_points': fight['method_points'],
            'strike_bonus': fight['strike_bonus'],
            'round_bonus': fight['round_bonus'],
            'total_points': fight['total_points']
        }
        fight_history_rows.append(fight_row)

pd.DataFrame(fight_history_rows).to_csv('../results/fight_history.csv', index=False)

#errors
print("WL ERROR: " + str(len(wlerror)))
for error in wlerror :
    print(error)

print("________________")
print("________________")
print("________________")

print("ERROR: " + str(len(lerror)))
for error in lerror :
    print(error)