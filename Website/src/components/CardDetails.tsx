import type {CardData} from "@/App.tsx"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

type CardDetailsProps = {cardData: CardData, index: number}
export default function CardDetails({cardData, index}: CardDetailsProps){
    return(
        <Dialog>
            <DialogTrigger render={<button><img className = "w-30 h-40" src = {cardData["PokemonInfo"]["Image"]} alt = "Pokemon card image"/> </button>}/>
            <DialogContent className= "flex flex-col items-center bg-[rgba(43,52,69,1)]">
                <DialogHeader>
                    <DialogTitle className = "font-[900] text-white text-lg">{cardData["PokemonInfo"]["Name"]} {cardData["PokemonInfo"]["cardID"]}</DialogTitle>
                </DialogHeader>
                <img src = {cardData["PokemonInfo"]["Image"]} alt = "Image"/>
                <h3 className = "text-white text-[20px]"> 
                    Set: {cardData["PokemonInfo"]["setName"]}
                </h3>
                <h4 className = "text-white">
                    <p className='font-[Roberto, sans-serif] mt-0'>
                        PSA 10: {cardData["PriceCharting"]["PSA 10"]} <br />
                        Grade 9: {cardData["PriceCharting"]["Grade9"]} <br />
                        Ungraded: {cardData["PriceCharting"]["Ungraded"]} <br />
                        {cardData["PriceCharting"]["Link"] != "-" && <a className = "text-blue-500" href = {cardData["PriceCharting"]["Link"]}>PriceCharting</a>}
                    </p>
                </h4>
                <h4 className = "text-white">
                    <p className='font-[Roberto, sans-serif] color-[rgba(240,255,255)]'>
                        High Price: ${cardData["TCGPlayer"]["High Price"]} <br />
                        Mid Price: ${cardData["TCGPlayer"]["Mid Price"]} <br />
                        Low Price: ${cardData["TCGPlayer"]["Low Price"]} <br />
                        Market Price: ${cardData["TCGPlayer"]["Market Price"]} <br/>
                        {cardData["TCGPlayer"]["Link"] != "null" && <a className="text-blue-500"href = {cardData["TCGPlayer"]["Link"]}>TCGPlayer</a>}
                    </p>
                </h4>
            <DialogFooter className="flex items-center self-stretch h-13">
                <DialogClose render={<button className = " w-11 h-7 bg-blue-500 rounded-[5px]">Close</button>} />
            </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}