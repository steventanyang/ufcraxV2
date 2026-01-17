import requests
import pandas as pd
from bs4 import BeautifulSoup
from concurrent.futures import ThreadPoolExecutor

print("=" * 50)
print("Starting remove_duplicates.py")
print("=" * 50)

# Process results/all_fights.csv
print("\n[1/2] Processing ../results/all_fights.csv...")
fights = pd.read_csv('../results/all_fights.csv')
original_count = len(fights)
print(f"  Original count: {original_count} fights")

fights_cleaned = fights.drop_duplicates(subset=['fight_url'])
cleaned_count = len(fights_cleaned)
duplicates_removed = original_count - cleaned_count
print(f"  After removing duplicates: {cleaned_count} fights")
print(f"  Duplicates removed: {duplicates_removed}")

sorted = fights_cleaned.sort_values(by="fight_url", ascending=False)
sorted.to_csv("../results/all_fights.csv", index=False)
print("  ✓ Saved to ../results/all_fights.csv")

# Process data/fights.csv
print("\n[2/2] Processing ../data/fights.csv...")
fights = pd.read_csv('../data/fights.csv')
original_count = len(fights)
print(f"  Original count: {original_count} fights")

fights_cleaned = fights.drop_duplicates(subset=['fight_url'])
cleaned_count = len(fights_cleaned)
duplicates_removed = original_count - cleaned_count
print(f"  After removing duplicates: {cleaned_count} fights")
print(f"  Duplicates removed: {duplicates_removed}")

sorted = fights_cleaned.sort_values(by="fight_url", ascending=False)
sorted.to_csv("../data/fights.csv", index=False)
print("  ✓ Saved to ../data/fights.csv")

print("\n" + "=" * 50)
print("✓ remove_duplicates.py completed successfully!")
print("=" * 50)