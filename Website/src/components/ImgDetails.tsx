import type {CardData} from "@/App.tsx"
import {
  Dialog,
  DialogContent,
  DialogTrigger,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { displayCard } from '@/App.tsx';
type ImgDetailsProps = {cardData: CardData[], img: string}
export default function ImgDetails({cardData, img}: ImgDetailsProps){
    return(
        <Dialog>
            <DialogTrigger render={<button><img className = "w-30 h-40" src = {`data:image/jpeg;base64,${img}`} alt = "Pokemon card image"/></button>}/> 
                <DialogContent className = "bg-[rgba(43,52,69,1)]">
                    <DialogHeader>
                        <DialogTitle className = "font-[900] text-white text-lg">Possible Cards (cards with same id)</DialogTitle>
                    </DialogHeader>
                    <ul className = "flex flex-wrap p-0 gap-2 w-fit align-center mt-[50px] mx-auto mb-0">{cardData.map((card, i) => displayCard(card, i))}</ul>
                </DialogContent>
        </Dialog>
    )
}