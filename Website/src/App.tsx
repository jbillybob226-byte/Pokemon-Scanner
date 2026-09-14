import { useState, useRef, useCallback} from 'react';
import './App.css';
import LiquidGlassBackground from "./LiquidGlassBackground";
import gridImg from './assets/grid.jpg';
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
  const [image, setImage] = useState<String[]>([]); //stores images encoded in base 64 (like they are outputted from webcam class)
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
      setImage([...image, screenShot]);
    }
    console.log("imageTaken")
  }
  return( 
    <div id = "root">
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
              const response = await fetch(`http://127.0.0.1:5000/pokemon?q=${cardId}`);
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
          </>
        ) : (null)
      }
      {(error && activeTab === "search") ? (
            <>
              <h1 className = "sorry-title">Sorry...</h1>
              <p className = "error-text">Card could not be found</p>
            </>
        ) : (
          <LiquidGlassBackground
            imageSrc= {gridImg}
            glassTargetRef={listRef}
            className="results-background"
            contentClassName="results-content"
            edgeSoftness={0}
            speed={0.6}
          >
            <ul ref = {listRef} className = {data.length > 1 ? "display-results-multi" : "display-results"}>{data.map((card, i) => displayCard(card, i))}</ul> 
          </LiquidGlassBackground>
        )
        }
    </div>
  );
}

export default App
