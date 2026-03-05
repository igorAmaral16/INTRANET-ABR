import { useEffect, useState } from "react";
import "./Carousel.css";

// simple looping carousel with fixed slides
import slide1 from "../../assets/slide1.jpg";
import slide2 from "../../assets/slide2.jpg";
import slide3 from "../../assets/slide3.jpg";
import slide4 from "../../assets/slide4.jpg";

export function Carousel() {
    const slides = [slide1, slide2, slide3, slide4];
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const id = setInterval(() => {
            setIndex((i) => (i + 1) % slides.length);
        }, 5000);
        return () => clearInterval(id);
    }, [slides.length]);

    return (
        <div className="carousel">
            <div
                className="carousel__track"
                style={{ transform: `translateX(-${index * 100}%)` }}
            >
                {slides.map((src, i) => (
                    <div key={i} className="carousel__slide">
                        <img src={src} alt={`Slide ${i + 1}`} />
                    </div>
                ))}
            </div>
        </div>
    );
}
