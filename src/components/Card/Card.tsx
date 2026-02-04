import React from 'react'
import Image from 'next/image'
import stone from "../../../public/assets/images/arms/nikelodeon/stone.png"
import paper from "../../../public/assets/images/arms/nikelodeon/paper.png"
import scissors from "../../../public/assets/images/arms/nikelodeon/scissors.png"

interface props {
    name: string;
    xside: "left" | "right";
    customcss: string;
}
const Card = ({ name, xside, customcss }: props) => {
    const getImage = () => {
        switch (name) {
            case "stone":
                return <Image src={stone} alt=""  priority={true} style={{  width: '100%', height: 'auto', }}/>
            case "paper":
                return <Image src={paper} alt=""  priority={true} style={{  width: '100%', height: 'auto', }}/>
            case "scissors":
                return <Image src={scissors} alt=""  priority={true} style={{  width: '100%', height: 'auto', }}/>
            default:
                return "No image"
        }   
    }

    const getBgColor = (name: string) => {
        switch (name) {
            case "stone":
                return "bg-stone-500"
            case "paper":
                return "bg-amber-500"
            case "scissors":
                return "bg-blue-500"
            default:
                return "bg-amber-400"
        }
    }
  return (
    <div className={`absolute transition-all duration-200 ease-in-out ${xside}-0 ${customcss} ${getBgColor(name)} w-36 sm:w-56 lg:w-72 xl:w-96  rounded-full ring-2 ring-gray-300 overflow-hidden`}>
        {getImage()}
    </div>
  )
}

export default Card