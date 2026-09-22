import { useState, useRef} from 'react';
import './App.css';
import Webcam from "react-webcam";

interface CardData {"PokemonInfo": {"Name": string, "setName": string, "cardID": string, "Image": string}, "PriceCharting": {"PSA 10": string, "Ungraded": string, "Grade9": string ,"Link": string}, "TCGPlayer": {"High Price": string, "Mid Price": string, "Low Price": string, "Market Price": string, "Link": string}, "cardMarket": {"Avg Price": string, "Low Price": string, "Link": string}}
function displayCard(cardData: CardData, index: number){
  return(
    <li className = "card-data" key = {index}>
      <h2 className = "card-name">
        {cardData["PokemonInfo"]["Name"]} {cardData["PokemonInfo"]["cardID"]}
      </h2>
      <img src = {cardData["PokemonInfo"]["Image"]} alt = "Image"></img>
      <h3 className = "set-name"> 
        Set: {cardData["PokemonInfo"]["setName"]}
      </h3>
      <h4 className = "pricecharting">
        <p>
           PSA 10: {cardData["PriceCharting"]["PSA 10"]} <br />
           Grade 9: {cardData["PriceCharting"]["Grade9"]} <br />
           Ungraded: {cardData["PriceCharting"]["Ungraded"]} <br />
           {cardData["PriceCharting"]["Link"] != "-" && <a href = {cardData["PriceCharting"]["Link"]}>PriceCharting</a>}
        </p>
      </h4>
      <h4 className = "tcg-player">
        <p>
           High Price: ${cardData["TCGPlayer"]["High Price"]} <br />
           Mid Price: ${cardData["TCGPlayer"]["Mid Price"]} <br />
           Low Price: ${cardData["TCGPlayer"]["Low Price"]} <br />
           Market Price: ${cardData["TCGPlayer"]["Market Price"]} <br/>
           {cardData["TCGPlayer"]["Link"] != "null" && <a href = {cardData["TCGPlayer"]["Link"]}>TCGPlayer</a>}
        </p>
      </h4>
    </li>
  );
}
function App() {
  const [activeTab, setActiveTab] = useState<"search" | "image">("search")
  const [cardId, setCardId] = useState("");
  const [data, setData] = useState<CardData[]>([]);
  const [inputStatus, setInputStatus] = useState("Enter card id");
  const [error, setError] = useState(false);
  const [images, setImage] = useState<string[]>([]); //stores images encoded in base 64 (like they are outputted from webcam class)
  const webcamRef = useRef<Webcam>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const videoConstraints = {
    width: 1920,
    height: 1080,
    facingMode: "environment"
  };
  function handleScreenshot(){
    const screenShot = webcamRef.current?.getScreenshot();
    if(typeof screenShot == "string"){
      setImage([...images, screenShot]);
    }
    console.log("imageTaken")
  }
  async function callAPI(collId: string){
    const response = await fetch(`http://127.0.0.1:5000/pokemon?q=${collId}`);
    if(response.ok){
      const newData = await response.json(); //make sure react gets the new data before rendering which setData(await response.json()) does not do
      setData(newData);
      console.log(newData);
    }
    else{
      setCardId("");
      setError(true);
    setInputStatus(`An error has occured code: ${response.status}`);
    }
  }
  async function sendImages(){
    const formData = new FormData()
    images.map((img) => formData.append("images", img))
    const response = await fetch("http://127.0.0.1:5000/scan-pokemon", {
      method: 'POST',
      body: formData
    });
    if (!response.ok) 
    { 
        console.log(response.status);
    }
    else{
      console.log("SUCCESS!!!")
      //call the api using each of the card ids
    }

  }
  return( 
    <div id = "top-wrapper">
      <div className = "search-island">
        <div className = "search-bar">
          <label htmlFor = "search">Enter card ID</label>
          <input id = "search" 
          placeholder = {inputStatus}
          className = "search-input"
          type = "text" 
          value = {cardId} 
          onChange = {(event) => setCardId(event.target.value)} 
          onKeyDown={async (event) => {
            if(event.key === "Enter"){
              setError(false);
              await callAPI(cardId)
            }
          }
          }/>
        </div>
        <button 
          className = "swap-to-image"
          onClick = {() => setActiveTab("image")}
        >
          <img src = "/public/cameraIcon.png"/>
          Use Image
        </button>
      </div>
      {activeTab === "image" ? (
        <>
          <Webcam
            audio = {false} 
            ref = {webcamRef} 
            screenshotFormat = "image/jpeg"
            videoConstraints = {videoConstraints}
            />
            <button
              className = "take-image"
              onClick = {() => handleScreenshot()} 
            />
            <button className = "send-images" onClick = {sendImages}>
              Ready!
            </button>
          </>
        ) : (null)
      }
      {(error && activeTab === "search") ? (
            <>
              <h1 className = "sorry-title">Sorry...</h1>
              <p className = "error-text">Card could not be found</p>
            </>
        ) : (
            <ul ref = {listRef} className = {data.length > 1 ? "display-results-multi" : "display-results"}>{data.map((card, i) => displayCard(card, i))}</ul> 
        )
        }
    </div>
  );
}
export default App
