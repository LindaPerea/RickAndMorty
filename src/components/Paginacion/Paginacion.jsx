import axios from 'axios';
import React, { useEffect, useState } from 'react';

const Paginacion = ({ prev, next, onPrevius, onNext }) => {

    const handlePrevius = () => {
        onPrevius();
    }

    const handleNext = () => {
        onNext();
    }

    return (
        <div>    
            <nav >
                <ul className='pagination justify-content-center mt-5'>
                    {prev ? 
                    (
                        <li className='page-item'>
                            <button className='page-link' onClick={handlePrevius}>Previus</button>
                        </li>
                    ) 
                    : null}
                    {
                   next ? 
                    ( 
                        <li className='page-item' >
                            <button className='page-link' onClick={handleNext}>Next</button>
                        </li>
                    )
                    
                    : null}
                </ul>
            </nav>
        </div>
    );
};

export default Paginacion;
