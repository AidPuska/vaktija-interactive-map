import { useEffect, useRef, useState } from 'react'
import './App.css'
import mapboxgl from 'mapbox-gl'
import axios from 'axios'
import { data } from './assets/data'
//import menu from './assets/menu.png'
import menu from './assets/vaktija.png'

const ACCESS_TOKEN = 'pk.eyJ1IjoiYWlkcHVza2EiLCJhIjoiY2w5cjk3b204MGVhejN1bzd4bjV0bGRzeSJ9.b3U1oVckpLq5tLd9SzmGkw';
mapboxgl.accessToken = ACCESS_TOKEN;

function App() {
  const mapContainer = useRef(null);
  const map = useRef(null);
  const [lng, setLng] = useState(18.4245335474766);
  const [lat, setLat] = useState(43.90163981872287);
  const [zoom, setZoom] = useState(7);
  const [vakat, setVakat] = useState(null)
  const [id, setId] = useState(77)
  const [city, setCity] = useState('')
  const [response, setResponse] = useState(null)
  const [error, setError] = useState(null)
  const pop = useRef(null)
  const search = useRef(null)

  const [clicked, setClicked] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {


    const getVakat = (id) => {
      setLoading(false)
      axios.get(`https://api.vaktija.ba/vaktija/v1/${id}`)
        .then(res => {
          setVakat(res.data)
          setLoading(true)
        })
    }

    getVakat(id)
    console.log('lokacija', vakat)
  }, [id])


  useEffect(() => {
    if (map.current) return; // initialize map only once
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [lng, lat],
      zoom: zoom,
    }, []);

    map.current.addControl(new mapboxgl.NavigationControl());

    map.current.on('load', () => {
      // Add a new source from our GeoJSON data and
      // set the 'cluster' option to true. GL-JS will
      // add the point_count property to your source data.
      map.current.addSource('locations', {
        type: 'geojson',
        // Point to GeoJSON data. This example visualizes all M1.0+ earthquakes
        // from 12/22/15 to 1/21/16 as logged by USGS' Earthquake hazards program.
        data: data,
        cluster: true,
        clusterMaxZoom: 14, // Max zoom to cluster points on
        clusterRadius: 50 // Radius of each cluster when clustering points (defaults to 50)
      });

      map.current.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'locations',
        filter: ['has', 'point_count'],
        paint: {
          // Use step expressions (https://docs.mapbcurrent.ox.com/mapbcurrent.ox-gl-js/style-spec/#expressions-step)
          // with three steps to implement three types of circles:
          //   * Blue, 20px circles when point count is less than 100
          //   * Yellow, 30px circles when point count is between 100 and 750
          //   * Pink, 40px circles when point count is greater than or equal to 750
          'circle-color': [
            'step',
            ['get', 'point_count'],
            '#606c38',
            10,
            '#023e8a',
            50,
            '#073b4c',
          ],
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            15,
            10,
            20,
            50,
            25
          ]
        }
      });

      map.current.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'locations',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
          'text-size': 12,
        }
      });

      map.current.loadImage(
        'https://res.cloudinary.com/dseufa3sg/image/upload/v1674663736/icons8-google-maps-50_lmqfll.png',
        (error, image) => {
          if (error) throw error;

          // Add the image to the map style.
          map.current.addImage('dot', image);
        })


      map.current.addLayer({
        id: 'unclustered-point',
        type: 'symbol',
        source: 'locations',
        filter: ['!', ['has', 'point_count']],
        layout: {
          'icon-image': 'dot', // reference the image
          'icon-size': 0.5
        }
        /* paint: {
          'circle-color': '#370617',
          'circle-radius': 8,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff'
        } */
      });

      // inspect a cluster on click
      map.current.on('click', 'clusters', (e) => {
        const features = map.current.queryRenderedFeatures(e.point, {
          layers: ['clusters']
        });
        const clusterId = features[0].properties.cluster_id;
        map.current.getSource('locations').getClusterExpansionZoom(
          clusterId,
          (err, zoom) => {
            if (err) return;

            map.current.easeTo({
              center: features[0].geometry.coordinates,
              zoom: zoom
            });
          }
        );
      });

      // When a click event occurs on a feature in
      // the unclustered-point layer, open a popup at
      // the location of the feature, with
      // description HTML from its properties.
      map.current.on('click', 'unclustered-point', (e) => {
        console.log(e.features[0].properties)
        setClicked(true)
        pop.current.style.display = 'block'
        const coordinates = e.features[0].geometry.coordinates.slice();
        // Ensure that if the map current.is zoomed out such that
        // multiple copies of the feature are visible, the
        // popup appears over the copy being pointed to.
        while (Math.abs(e.lngLat.lng - coordinates[0]) > 180) {
          coordinates[0] += e.lngLat.lng > coordinates[0] ? 360 : -360;
        }

        new mapboxgl.Popup()
          .setLngLat(coordinates)
          .setDOMContent(pop.current)
          .addTo(map.current);
        const i = data.features.findIndex(el => el.properties.city === e.features[0].properties.city)
        console.log('index:', i)
        setId(i)
      });

      map.current.on('mouseenter', 'clusters', () => {
        map.current.getCanvas().style.cursor = 'pointer';
      });
      map.current.on('mouseleave', 'clusters', () => {
        map.current.getCanvas().style.cursor = '';
      });
    })

    /* for (let i = 0; i < data.length; i++) {

      const mark = new mapboxgl.Marker({ scale: 0.8, color: '#073b4c' })
        //.setLngLat(data[i].coordinates)
        .setLngLat(data.features[i].geometry.coordinates)
        .addTo(map.current)
      mark.getElement().addEventListener('click', (e) => {
        setClicked(true)
        pop.current.style.display = 'block'
        mark.setPopup(new mapboxgl.Popup({ offset: 25 }).setDOMContent(pop.current))
        setId(data.indexOf(data.features[i]))
      })
    } */

  });


  const handleClick = (response) => {
    map.current.flyTo({ center: response[0].geometry.coordinates, zoom: 12 })
    search.current.style.visibility = 'hidden'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    /* const cityUpperCase = city[0].toUpperCase() + city.slice(1)
    const res = data.features.filter(el => el.properties.city.includes(cityUpperCase));
    if (res.length > 0) {
      setError(null)
      setResponse(res)
      search.current.style.visibility = 'visible'
    } else {
      setError('No requested city in Vaktija database')
    } */
  }

  const handleChange = (e) => {
    setCity(e.target.value);
    const cityUpperCase = city[0].toUpperCase() + city.slice(1)
    const res = data.features.filter(el => el.properties.city.includes(cityUpperCase));

    if (res.length > 0) {
      setError(null)
      setResponse(res)
      search.current.style.visibility = 'visible'
    } else {
      setError('No requested city in Vaktija database')
    }
    if (e.target.value === '') {
      search.current.style.visibility = 'hidden'
    }
  }

  return (
    <div className="App" style={{ position: 'relative' }}>
      <div className='navbar'>
        <p className='navTitle'>Vaktija Interactive Map</p>
        <form onSubmit={handleSubmit}>
          <div className='searchPart'>
            <input className='input' type="text" placeholder='Search for a city...' onChange={(e) => handleChange(e)} />
            <button className='button'>Search</button>
          </div>
          {response && <div className='search' ref={search}>
            <p>City found: </p>
            {response.map(vakat => (<div>
              <li className='result' onClick={() => handleClick(response)}>{vakat.properties.city}, Available</li>
            </div>))}
          </div>}
          {error && <div className='error'>{error}</div>}
        </form>
        <img className='image' src={menu} alt="menu_icon" />
      </div>
      <div ref={mapContainer} className='map' />

      <div ref={pop} className='container' >
        {clicked && vakat &&
          <>
            {loading ? <><h3 className='header'>{vakat && vakat.lokacija}</h3>
              <p className='text'>Izlazak sunca: {vakat && vakat.vakat[1]}</p>
              <p className='text'>Podne: {vakat && vakat.vakat[2]}</p>
              <p className='text'>Ikindija: {vakat && vakat.vakat[3]}</p>
              <p className='text'>Aksam: {vakat && vakat.vakat[4]}</p>
              <p className='text'>Jacija: {vakat && vakat.vakat[5]}</p></> : <div style={{ color: 'white' }}>Loading...</div>}
          </>
        }
      </div>

      <div className='footer'>
        <p>Vaktija Interactive Map 2023</p>
        <p>Made with React, Mapbox, and Vaktija.ba Api</p>
      </div>

    </div>
  )
}

export default App
