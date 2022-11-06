import React from 'react';
import banner1 from '../assets/img/banner1.jpg'


const Header = () => {

    return (
        <div>
            
            <div className='header' style={{ backgroundImage: `url(${banner1})` }}>
                <div className='width'>
                <nav>
                <a href="/" className='text-uppercase h1'>Rick and Morty</a>
            </nav>

                </div>
            </div>
        </div>
    );
};

export default Header;
