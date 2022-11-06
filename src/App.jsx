import './App.css'
import Ricky from './components/Ricky'
import Header from './components/Header'
import './header.css'
import Paginacion from './components/Paginacion/Paginacion'
import { useEffect, useState } from 'react'
import axios from 'axios'





function App() {

  const [info, setInfo ] = useState({});

  const onPrevius = () => {
    {info.prev};
  }

  const onNext = () => {
    {info.next};
  }
  
    useEffect(() => {   
        axios.get('https://rickandmortyapi.com/api/location/')
          .then(res => setInfo(res.data.info))
    
      },[]);
      console.log(info);

  return (
    <div className="App">
      <div>
        <Header />        
      </div>
      <div className=''>
        <Paginacion prev={info.prev} next={info.next} onPrevius={onPrevius} onNext={onNext}/>
      </div>

      <div className=''>

        <Ricky />

      </div>
      <div>
        <Paginacion prev={info.prev} next={info.next} onPrevius={onPrevius} onNext={onNext}/>
      </div>




    </div>
  )
}

export default App
