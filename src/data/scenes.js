// Panorama rasmlarini URL sifatida import qilish
// ?url qo'shish orqali Vite ularni bevosita URL sifatida beradi (inline qilmaydi)
import scene1Img from '../assets/panoramas/scene1.jpg?url';
import scene2Img from '../assets/panoramas/scene2.jpg?url';
import scene3Img from '../assets/panoramas/scene3.jpg?url';

// Main scenes data
// x maps to yaw (horizontal), y maps to pitch (vertical)
export const scenesData = [
    {
        image: scene1Img,
        title: 'Birinchi manzil',
        description: 'Virtual sayohatning boshlanishi',
        initialImage: true,
        initialView: { x: 103 },
        pins: [
            {
                x: 80,
                y: 0,
                z: 0,
                toImage: scene2Img,
                title: "Keyingi manzil 2",
                desc: "Asosiy ko'cha Uylar",
                icon: 'circle'
            },
        ]
    },
    {
        image: scene2Img,
        title: 'Ikkinchi manzil',
        description: 'Davom etish',
        initialView: { x: 225 },
        pins: [
            {
                x: -88,
                y: 0,
                z: 0,
                toImage: scene1Img,
                title: "Ortga 1 manzilga",
                desc: "Asosiy ko'cha Uylar"
            },
            {
                x: 90,
                y: 0,
                z: 0,
                toImage: scene3Img,
                title: "Keyingi manzil 3",
                desc: "Asosiy ko'cha Karaoke"
            }
        ]
    },
    {
        image: scene3Img,
        title: 'Uchinchi manzil',
        description: 'Oxirgi nuqta',
        initialView: { x: 155 },
        pins: [
            {
                x: -83,
                y: 0,
                z: 0,
                toImage: scene2Img,
                title: "Ortga 2 manzilga",
                desc: "Asosiy ko'cha Uylar"
            }
        ]
    }
];

// Helper to find scene by image URL string
export const getSceneByImage = (imageUrl) => {
    return scenesData.find(scene => scene.image === imageUrl);
};
