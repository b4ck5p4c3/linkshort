import ToroHeyyy from "./../assets/toro_heyyy.png";
import ToroSeating from "./../assets/toro_seating.png"
import ToroEat from "./../assets/toro_eat.png"

export default function HomePage() {
    const loginUrl = `${window.location.origin}/sign-in`
    const B4CKUrl = "0x08.in";

    return(
        <>
        <div className="center">
            <img src={ToroHeyyy}></img>
            <div className="nes-container is-dark">
                <p className="title">howdy!!<br></br>
                you've arrived to linkshortener site of Saint-Petersburg's hackerspace <a href={B4CKUrl}>B4CKSP4CE</a>.<br></br>
                if you're a resident, press <a href={loginUrl}>here</a>.</p>
            </div>
        </div>
        <div className="down">
            <img src={ToroSeating} width="256" height="256"></img>
            <img src={ToroEat} width="256" height="256"></img>
        </div>
        </>
    )
}


       // <div className="down">
       //     <img src={ToroSeating} width="256" height="256"></img>
       //     <img src={ToroEat}></img>
       // </div>