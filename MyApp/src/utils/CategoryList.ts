import { Float, Int32 } from "react-native/Libraries/Types/CodegenTypes"

export interface CategoriesLst{
    id:string,
    name:string,
    color:string,
    category:string,
    image:string
}

export let Categorylist:CategoriesLst[]=[
     {  id: "1",
        name: "Smartphones",
        color: "blue", 
        category: "smartphones",
      image: require("../../assets/smartphones.png")
    },
    {  id: "2",
        name: "Laptops",
        color: "purple", 
        category: "laptops",
        image:require("../../assets/laptops.png")
    },
    {  id: "3",
        name: "Tablets",
        color: "teal", 
        category: "tablets",
        image:require("../../assets/tablets.png")
    },
    {  id: "4",
        name: "Cameras",
        color: "coral", 
        category: "cameras",
        image:require("../../assets/cameras.png")
    },
    {  id: "5",
        name: "Audio",
        color: "amber", 
        category: "audio",
        image:require("../../assets/audio.png")
    },

]
