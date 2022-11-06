import axios from 'axios';
import React, { useEffect, useState } from 'react';
import '../ricky.css'


const RickyItem = ({ url }) => {


    const [personaje, setPersonaje] = useState({});
    // const [ status, setStatus ] = useState("Alive");

    // const alive = () => {
    //     status ? `${p}`: "Dead"
    // }



    useEffect(() => {
        axios.get(url)
            .then(res => setPersonaje(res.data))

    }, []);

    // console.log(personaje);

    return (
        <div >
            <div className='align' >

                <div className=''>
                    <div className='container'>
                        <div className='user-card'>
                            "{personaje.name}" 
                            <div >
                                <img src={personaje.image} alt="" />
                            </div>
                            
                                <div className='li'>
                                    <li><b> Status:</b> {personaje.status}</li>
                                    <li><b> Location:</b> {personaje.location?.name}</li>
                                    <li><b> Species:</b> {personaje.species}</li>
                                    <li><b> Sexo:</b> {personaje.gender}</li>
                                    <li><b> Episode:</b>{personaje.episode?.length}</li>
                                    <li><b> Origin-Name:</b> {personaje.origin?.name}</li>
                                </div>
                            
                        </div>
                    </div>
                </div>

            </div>





        </div>

    );
};

export default RickyItem;