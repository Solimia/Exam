const apiKey = 'c17122ced6e227a8994466e8cccf6924'; 

const cityInput = document.getElementById('cityInput');
const todayTab = document.getElementById('todayTab');
const forecastTab = document.getElementById('forecastTab');
const todayPanel = document.getElementById('todayPanel');
const forecastPanel = document.getElementById('forecastPanel');

let currentCity = 'Львів';
let fiveDayData = {};


todayTab.onclick = () => {
  todayPanel.classList.add('active');
  forecastPanel.classList.remove('active');
  todayTab.classList.add('active');
  forecastTab.classList.remove('active');
};

forecastTab.onclick = () => {
  todayPanel.classList.remove('active');
  forecastPanel.classList.add('active');
  todayTab.classList.remove('active');
  forecastTab.classList.add('active');
};

// ------------------ Завантаження сторінки ------------------

window.onload = () => {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(pos => {
      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      getCityByCoords(lat, lon);
    }, () => {
      getWeatherByCity(currentCity);
    });
  } else {
    getWeatherByCity(currentCity);
  }
};

cityInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    getWeatherByCity(cityInput.value.trim());
  }
});

// ------------------ Отримання міста за координатами ------------------

function getCityByCoords(lat, lon) {
  fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=ua`)
    .then(res => res.json())
    .then(data => {
      currentCity = data.name;
      cityInput.value = currentCity;
      loadWeatherData(currentCity);
    });
}


function getWeatherByCity(city) {
  currentCity = city;
  cityInput.value = city;

  fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}&appid=${apiKey}&units=metric&lang=ua`)
    .then(res => res.json())
    .then(data => {
      if (data.cod === "404") {
        showErrorPage(city);
      } else {
        renderCurrentWeather(data);
        fetchHourlyForecast(data.coord.lat, data.coord.lon);
        fetchNearbyCities(data.coord.lat, data.coord.lon);
      }
    });

  fetch(`https://api.openweathermap.org/data/2.5/forecast?q=${city}&appid=${apiKey}&units=metric&lang=ua`)
    .then(res => res.json())
    .then(data => {
      if (data.cod === "200") {
        renderFiveDayForecast(data);
      }
    });
}


function showErrorPage(city) {
  document.getElementById('currentWeather').innerHTML = '';
  document.getElementById('hourlyForecast').innerHTML = '';
  document.getElementById('nearbyCities').innerHTML = '';
  document.getElementById('fiveDayForecast').innerHTML = '';
  document.getElementById('detailedDayForecast').innerHTML = `
    <div style="color: red; font-size: 1.2rem; margin-top: 20px;">
      Місто "<strong>${city}</strong>" не знайдено. Перевірте правильність написання.
    </div>
  `;
}

// ------------------ Сьогоднішня погода ------------------

function renderCurrentWeather(data) {
  const block = document.getElementById('currentWeather');
  const sunrise = new Date(data.sys.sunrise * 1000);
  const sunset = new Date(data.sys.sunset * 1000);
  const dayLength = (data.sys.sunset - data.sys.sunrise) / 3600;

  block.innerHTML = `
    <h2>Погода в ${data.name} (${new Date().toLocaleDateString()})</h2>
    <img src="https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png">
    <p>${data.weather[0].description}</p>
    <p>Температура: ${data.main.temp} °C (відчувається як ${data.main.feels_like} °C)</p>
    <p>Світанок: ${sunrise.toLocaleTimeString()}</p>
    <p>Захід: ${sunset.toLocaleTimeString()}</p>
    <p>Тривалість дня: ${dayLength.toFixed(1)} год</p>
  `;
}

// ------------------ Погодинний прогноз ------------------

function fetchHourlyForecast(lat, lon) {
  fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=ua`)
    .then(res => res.json())
    .then(data => {
      const block = document.getElementById('hourlyForecast');
      const today = new Date().getDate();
      const items = data.list.filter(i => new Date(i.dt_txt).getDate() === today);

      block.innerHTML = `<h3>Погодинний прогноз</h3>` + items.map(i => `
        <div>
          <strong>${new Date(i.dt_txt).getHours()}:00</strong> - 
          ${i.weather[0].description},
          ${i.main.temp} °C (відч. ${i.main.feels_like} °C),
          вітер: ${i.wind.speed} м/с
        </div>
      `).join('');
    });
}

// ------------------ Найближчі міста ------------------

function fetchNearbyCities(lat, lon) {
  fetch(`https://api.openweathermap.org/data/2.5/find?lat=${lat}&lon=${lon}&cnt=5&appid=${apiKey}&units=metric&lang=ua`)
    .then(res => res.json())
    .then(data => {
      const block = document.getElementById('nearbyCities');
      block.innerHTML = `<h3>Найближчі міста</h3>` + data.list.map(c => `
        <div>${c.name} - 
          <img src="https://openweathermap.org/img/wn/${c.weather[0].icon}.png"> 
          ${c.main.temp} °C</div>
      `).join('');
    });
}

// ------------------ Прогноз на 5 днів ------------------

function renderFiveDayForecast(data) {
  const block = document.getElementById('fiveDayForecast');
  const detailedBlock = document.getElementById('detailedDayForecast');
  block.innerHTML = `<h2>5-денний прогноз</h2>`;
  detailedBlock.innerHTML = '';
  fiveDayData = {};
  data.list.forEach(i => {
    const date = i.dt_txt.split(' ')[0];
    if (!fiveDayData[date]) fiveDayData[date] = [];
    fiveDayData[date].push(i);
  });

  let first = true;
  for (let date in fiveDayData) {
    const dayName = new Date(date).toLocaleDateString('uk-UA', { weekday: 'long' });
    const icon = fiveDayData[date][0].weather[0].icon;
    const desc = fiveDayData[date][0].weather[0].description;
    const avgTemp = (
      fiveDayData[date].reduce((sum, i) => sum + i.main.temp, 0) / fiveDayData[date].length
    ).toFixed(1);

    const dayDiv = document.createElement('div');
    dayDiv.classList.add('day-block');
    if (first) dayDiv.classList.add('selected');

    dayDiv.innerHTML = `
      <div><strong>${dayName}, ${date}</strong></div>
      <img src="https://openweathermap.org/img/wn/${icon}.png">
      <div>${avgTemp} °C, ${desc}</div>
    `;

    dayDiv.onclick = () => {
      document.querySelectorAll('.day-block').forEach(d => d.classList.remove('selected'));
      dayDiv.classList.add('selected');
      renderDetailedForecast(date);
    };

    block.appendChild(dayDiv);

    if (first) {
      renderDetailedForecast(date);
      first = false;
    }
  }
}

// ------------------ Деталізація одного дня ------------------

function renderDetailedForecast(date) {
  const detailedBlock = document.getElementById('detailedDayForecast');
  const items = fiveDayData[date];

  detailedBlock.innerHTML = `<h3>Погодинний прогноз на ${date}</h3>`;
  detailedBlock.innerHTML += items.map(i => {
    const time = new Date(i.dt_txt).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    const icon = i.weather[0].icon;
    const desc = i.weather[0].description;
    const temp = i.main.temp;
    const feels = i.main.feels_like;
    const wind = i.wind.speed;
    const dir = i.wind.deg;

    return `
      <div style="margin-bottom: 8px;">
        <strong>${time}</strong> - 
        <img src="https://openweathermap.org/img/wn/${icon}.png"> 
        ${desc}, ${temp} °C (відч. ${feels} °C), 
        вітер: ${wind} м/с, напрям: ${getWindDirection(dir)}
      </div>
    `;
  }).join('');
}

function getWindDirection(deg) {
  const directions = ['Пн', 'Пн-Сх', 'Сх', 'Пд-Сх', 'Пд', 'Пд-Зх', 'Зх', 'Пн-Зх'];
  return directions[Math.round(deg / 45) % 8];
}
