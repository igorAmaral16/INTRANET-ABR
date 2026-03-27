import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { resolverUrlApi } from "../../utils/urlApi";
import { useCarousel } from "../../hooks/useCarousel";
import type { CarouselItemResumo } from "../../tipos/carousel";
import "./Carousel.css";

export function Carousel() {
    const { itens, estado } = useCarousel();
    const [index, setIndex] = useState(0);
    const trackRef = useRef<HTMLDivElement | null>(null);
    const startXRef = useRef<number | null>(null);
    const isDraggingRef = useRef(false);
    const navigate = useNavigate();

    // advance automatically
    useEffect(() => {
        if (!itens || itens.length === 0) return;
        const id = setInterval(() => {
            setIndex((i) => (i + 1) % itens.length);
        }, 5000);
        return () => clearInterval(id);
    }, [itens]);

    // ensure index stays in range when items change
    useEffect(() => {
        if (itens && index >= itens.length) {
            setIndex(0);
        }
    }, [itens, index]);

    const goTo = (i: number) => {
        if (!itens || itens.length === 0) return;
        const n = ((i % itens.length) + itens.length) % itens.length;
        setIndex(n);
    };

    const onPointerDown = (ev: React.PointerEvent) => {
        startXRef.current = ev.clientX;
        trackRef.current?.setPointerCapture(ev.pointerId);
    };

    const onPointerMove = (ev: React.PointerEvent) => {
        if (startXRef.current === null || !trackRef.current) return;
        const delta = ev.clientX - startXRef.current;
        if (Math.abs(delta) > 5) {
            isDraggingRef.current = true;
        }
        const width = trackRef.current.offsetWidth;
        const percent = (delta / width) * 100;
        trackRef.current.style.transform = `translateX(-${index * 100 - percent}%)`;
    };

    const onPointerUp = (ev: React.PointerEvent) => {
        if (startXRef.current === null) return;
        const delta = ev.clientX - startXRef.current;
        const threshold = 30; // pixels, more sensitive
        if (!isDraggingRef.current || Math.abs(delta) < threshold) {
            // treat as click
            navigate(`/anuncio/${itens[index].id}`);
        } else {
            // standard behaviour: swipe left → next slide; swipe right → previous slide
            if (delta < -threshold) {
                goTo(index + 1);
            } else if (delta > threshold) {
                goTo(index - 1);
            }
        }
        isDraggingRef.current = false;
        startXRef.current = null;
        // restore normal transform
        if (trackRef.current) {
            trackRef.current.style.transform = `translateX(-${index * 100}%)`;
        }
    };

    const onPointerCancel = () => {
        // reset state if pointer capture lost
        isDraggingRef.current = false;
        startXRef.current = null;
        if (trackRef.current) {
            trackRef.current.style.transform = `translateX(-${index * 100}%)`;
        }
    };

    // whenever the number of slides changes or index updates, make sure
    // the track is positioned correctly and avoid animation glitches
    useEffect(() => {
        if (!trackRef.current || itens.length === 0) return;
        // temporarily disable transition to reposition instantly
        trackRef.current.style.transition = "none";
        trackRef.current.style.transform = `translateX(-${index * 100}%)`;
        // force reflow then restore
        void trackRef.current.offsetWidth;
        trackRef.current.style.transition = "transform 0.6s ease";
    }, [itens.length, index]);

    if (estado === "carregando" || !itens || itens.length === 0) {
        return null; // nothing to show yet
    }

    return (
        <div className="carousel">
            <button
                className="carousel__arrow carousel__arrow--left"
                onClick={() => goTo(index - 1)}
                aria-label="Anterior"
            >
                ‹
            </button>
            <button
                className="carousel__arrow carousel__arrow--right"
                onClick={() => goTo(index + 1)}
                aria-label="Próximo"
            >
                ›
            </button>
            <div
                ref={trackRef}
                className="carousel__track"
                style={{ transform: `translateX(-${index * 100}%)` }}
                onPointerDown={onPointerDown}
                onPointerMove={onPointerMove}
                onPointerUp={onPointerUp}
                onPointerCancel={onPointerCancel}
            >
                {itens.map((item: CarouselItemResumo) => (
                    <div
                        key={item.id}
                        className="carousel__slide"
                        onClick={() => navigate(`/anuncio/${item.id}`)}
                    >
                        <div className="carousel__imageWrapper">
                            <img
                                src={resolverUrlApi(item.imagem_url || "")}
                                alt={item.titulo}
                                className="carousel__image"
                                loading="lazy"
                            />
                        </div>
                        {item.titulo ? (
                            <div className="carousel__caption">{item.titulo}</div>
                        ) : null}
                    </div>
                ))}
            </div>
            <div className="carousel__indicators">
                {itens.map((_, i) => (
                    <button
                        key={i}
                        className={`carousel__indicator ${i === index ? "carousel__indicator--active" : ""}`}
                        onClick={() => goTo(i)}
                        aria-label={`Slide ${i + 1}`}
                    />
                ))}
            </div>
        </div>
    );
}
