import requests
from bs4 import BeautifulSoup
from pokemontcgsdk import Card
import traceback
from playwright.sync_api import sync_playwright
def formatString(input):
    input = input.split(" - ")[0]
    input = input.replace(" ", "-")
    input = input.lower()
    if "ex" in input:
        input = input.split("ex")[0] + "ex"
    return input
pokewallet = "https://api.pokewallet.io/search"
apiKey = {"X-API-Key": "pk_test_1455fa770d0218620d4b6b8a16d4be1317de0767e0417a54"}
def get_card(cardFractions): 
    p = sync_playwright().start()
    browser = p.chromium.launch(headless = True)
    def return_page(url):
        tab = browser.new_page()
        try:
            tab.goto(url)
            tab.wait_for_selector("img.v-lazy-image-loaded")
            return tab.content()
        finally:
            tab.close()
    for i in range(0, len(cardFractions), 1):
        cardInfo = requests.get(pokewallet, headers = apiKey, params = {"q":f"{cardFractions[i]}"}).json()
        result = []
        for i in range(len(cardInfo["results"])):
            pokemonName = formatString(cardInfo["results"][i]["card_info"]["name"])
            setName = formatString(cardInfo["results"][i]["card_info"]["set_name"])
            pokemonNumber = cardFractions[i].split("/")[0]
            url = f"https://www.pricecharting.com/game/pokemon-{setName}/{pokemonName}-{pokemonNumber}"
            response = requests.get(url)
            soup = BeautifulSoup(response.text, "html.parser")
            bumLink = True;
            try:
                PSA10 = soup.find("td", string = "PSA 10").find_next_sibling("td").text
                bumLink = False;
            except Exception:
                PSA10 = "-"
            try:
                ungraded = soup.find("td", string = "Ungraded").find_next_sibling("td").text 
                bumLink = False;
            except Exception:
                ungraded = "-"
            try:
                Grade9 = soup.find("td", string = "Grade 9").find_next_sibling("td").text
                bumLink = False;
            except Exception:
                Grade9 = "-"
            if(bumLink): #prevents it from linking to a pricecharting search page instead of the actual link
                url = "-"
            
            imgPage = None
            imgFinder = None
            image = "none"
            try:
                imgPage = requests.get(url)
                imgFinder = BeautifulSoup(imgPage.text, "html.parser")
                image = imgFinder.find("img", class_ = "js-show-dialog")["src"]   
            except Exception:
                try:
                    print("bums")
                    imgPage = return_page(cardInfo["results"][i]["tcgplayer"]["url"])
                    imgFinder = BeautifulSoup(imgPage, "html.parser")
                    image = imgFinder.find("img", class_ = "v-lazy-image-loaded")["src"]
                    
                except Exception:
                    traceback.print_exc()
            TCGhigh = "-"
            TCGmid = "-"
            TCGlow = "-"
            TCGmarket = "-"
            TCGlink = "null"
            if(cardInfo["results"][i]["tcgplayer"] is not None): 
                TCGhigh = cardInfo["results"][i]["tcgplayer"]["prices"][0]["high_price"]
                TCGmid = cardInfo["results"][i]["tcgplayer"]["prices"][0]["mid_price"]
                TCGlow = cardInfo["results"][i]["tcgplayer"]["prices"][0]["low_price"] 
                TCGmarket = cardInfo["results"][i]["tcgplayer"]["prices"][0]["market_price"]
                TCGlink = cardInfo["results"][i]["tcgplayer"]["url"]
            result.append({"PokemonInfo": {"Name": pokemonName, "setName": setName, "cardID": cardFractions[i], "Image" : image}, "PriceCharting": {"PSA 10": PSA10, "Grade9": Grade9 , "Ungraded": ungraded, "Link": url}, "TCGPlayer": {"High Price": TCGhigh, "Mid Price": TCGmid, "Low Price": TCGlow, "Market Price": TCGmarket, "Link": TCGlink}})
    return result