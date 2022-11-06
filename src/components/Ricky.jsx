import React, { useEffect, useState } from 'react';
import axios from 'axios';
import RickyItem from './RickyItem';



const Ricky = () => {

    const [rickyList, setRickyList] = useState({});
    const [typeId, setTypeId] = useState("");

    useEffect(() => {
        const randomId = Math.floor(Math.random() * 125) + 1;

        axios.get(`https://rickandmortyapi.com/api/location/${randomId}`)
            .then(res => setRickyList(res.data))

    }, []);

    // console.log(rickyList);

    const searchType = () => {
        axios.get(`https://rickandmortyapi.com/api/location/${typeId}`)
            .then(res => setRickyList(res.data))

    };




    return (
        <div className='text-center '>

            <h1>{rickyList.name}</h1>
            <li><b>Type:</b> {rickyList.type}</li>
            <li><b>Dimension:</b> {rickyList.dimension}</li>
            <li><b>Residents:</b> {rickyList.residents?.length}</li>
            <input
                type="text"
                value={typeId}
                onChange={(e) => setTypeId(e.target.value)}
            />
            <button onClick={searchType}>Seacrh</button>
            <div className=''>
                <div className='' >
                    

                        {rickyList.residents?.map(personaje => (

                            <RickyItem url={personaje} key={personaje} />


                        ))}
                    

                </div>

            </div>

        </div>
    );
};

export default Ricky;