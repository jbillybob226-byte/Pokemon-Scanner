import { useState, useRef} from 'react';
import './App.css';
import Webcam from "react-webcam";
import CardDetails from '@/components/CardDetails';

export interface CardData {"PokemonInfo": {"Name": string, "setName": string, "cardID": string, "Image": string}, "PriceCharting": {"PSA 10": string, "Ungraded": string, "Grade9": string ,"Link": string}, "TCGPlayer": {"High Price": string, "Mid Price": string, "Low Price": string, "Market Price": string, "Link": string}, "cardMarket": {"Avg Price": string, "Low Price": string, "Link": string}}
function displayCard(cardData: CardData, index: number){
    return(
        <li className = "color-aqua-500" key = {index}>
            <CardDetails cardData = {cardData} index = {index}/>
        </li>
    );
}
function App(){
  const [activeTab, setActiveTab] = useState<"search" | "image">("search")
  const [cardId, setCardId] = useState("");
  const [data, setData] = useState<CardData[]>([]);
  const [renderResults, setRenderResults] = useState<boolean>(false) 
  const [inputStatus, setInputStatus] = useState("Enter collector Id");
  const [images, setImages] = useState<string[]>([]); //stores images encoded in base 64 (like they are outputted from webcam class)
  const webcamRef = useRef<Webcam>(null);
  const videoConstraints = {
    width: 720,
    height: 1080,
    facingMode: "environment"
  };
  function handleScreenshot(){
    const screenShot = webcamRef.current?.getScreenshot();
    if(typeof screenShot == "string"){
      setImages([...images, screenShot]);
    }
    console.log("imageTaken")
  }
  async function callAPI(collId: string){
    const response = await fetch(`http://127.0.0.1:5000/pokemon?q=${collId}`);
    if(response.ok){
        const newData = await response.json(); //make sure react gets the new data before rendering which setData(await response.json()) does not do
        setData(newData);
        setRenderResults(true)
        console.log(newData);
    }
    else{
        setCardId("");
        setInputStatus(`An error has occured ${response.status}`);
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
        setRenderResults(true)
        setImages([])
        //call the api using each of the card ids
    }
  }
  return( 
    <div className = "flex flex-col bg-[url('assets/grid.jpg')] bg-cover min-h-screen">
        <div className = "sticky top-0 mb-5">
            <div className = "gap-[10px] flex justify-center align-center">
                <label className='whitespace-nowrap text-[16px] text-[rgba(240,248,255)]'>Pokescanner</label>
                <input id = "search" 
                    placeholder = {inputStatus}
                    className = "flex items-center justify-center h-[32px] min-w-[100px] max-w-[250px] py-0.5 px-[clamp(0px,2vh,20px)] mt-auto rounded-[15px] border-1 border-black bg-[rgba(255,255,255,0.5)] focus:bg-[rgba(255,255,255,0.3)] focus:outline-2 focus:outline-black whitespace-nowrap text-[16px]"
                    type = "text" 
                    value = {cardId} 
                    onChange = {(event) => setCardId(event.target.value)} 
                    onKeyDown={async (event) => {
                        if(event.key === "Enter"){
                            setRenderResults(false)
                            await callAPI(cardId)
                        }
                    }
                }/>
                <button 
                    className = "whitespace-nowrap text-[clamp(8px,2vw,16px)] bg-[rgba(255,255,255,0.5)] border-black text-black rounded-[10px] border flex justify-center items-center h-[30px]"
                    onClick = {() => 
                        {setRenderResults(false)
                        setActiveTab(activeTab === "image" ? "search": "image")}}
                    >
                    <img className = "min-w-[20px] h-[20px]" src = "/public/cameraIcon.png"/>
                        <span className='hidden min-[300px]:flex'>
                           Use Image 
                        </span>
                        
                </button>
            </div>
      </div>
        {activeTab === "image" ? (
            <div className = "flex flex-col justify-center items-center">
                <Webcam
                    className = "pb-3 w-[250px] aspect-[9/16] object-cover"
                    audio = {false} 
                    ref = {webcamRef} 
                    screenshotFormat = "image/jpeg"
                    videoConstraints = {videoConstraints}
                />
                <button
                    className = "w-40 h-10 mb-3 bg-blue-500"
                    onClick = {() => handleScreenshot()} 
                >
                    Take Image
                </button>
                <button className = "bg-blue-500" onClick = {sendImages}>
                    Ready!
                </button>
                <ul className='flex flex-col gap-y-5'>{images.map((picture) => <img src = {picture}></img>)}</ul>
            </div>
            ) : (null)
        }
        {(renderResults) ? (
                <ul className = "flex flex-wrap p-0 gap-2 w-fit align-center mt-[50px] mx-auto mb-0 ">{data.map((card, i) => displayCard(card, i))}</ul> 
            ) : (null)
        }
    </div>
  );
}
export default App
