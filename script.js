const train = document.getElementById("train");
const backgroundLines = document.getElementById("backgroundLines");

const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const resetBtn = document.getElementById("resetBtn");

const timeValue = document.getElementById("timeValue");
const velocityValue = document.getElementById("velocityValue");
const accelerationValue = document.getElementById("accelerationValue");
const positionValue = document.getElementById("positionValue");

const phaseTitle = document.getElementById("phaseTitle");
const phaseDescription = document.getElementById("phaseDescription");

const positionCanvas = document.getElementById("positionChart");
const velocityCanvas = document.getElementById("velocityChart");
const accelerationCanvas = document.getElementById("accelerationChart");

const positionCtx = positionCanvas.getContext("2d");
const velocityCtx = velocityCanvas.getContext("2d");
const accelerationCtx = accelerationCanvas.getContext("2d");

const steps = document.querySelectorAll(".step");

const KMH_TO_MS = 1 / 3.6;
const MS_TO_KMH = 3.6;

const totalTime = 50;

const motionSegments = [
  {
    start: 0,
    end: 5,
    v0: 0 * KMH_TO_MS,
    vf: 80 * KMH_TO_MS,
    title: "El tren parte del reposo",
    description: "Durante los primeros 5 segundos, el tren acelera desde 0 hasta 80 km/h."
  },
  {
    start: 5,
    end: 10,
    v0: 80 * KMH_TO_MS,
    vf: 80 * KMH_TO_MS,
    title: "Velocidad constante",
    description: "El tren mantiene una velocidad constante de 80 km/h. La aceleración es cero."
  },
  {
    start: 10,
    end: 15,
    v0: 80 * KMH_TO_MS,
    vf: 120 * KMH_TO_MS,
    title: "Segunda aceleración",
    description: "El tren aumenta su velocidad de 80 km/h a 120 km/h."
  },
  {
    start: 15,
    end: 20,
    v0: 120 * KMH_TO_MS,
    vf: 150 * KMH_TO_MS,
    title: "Tercera aceleración",
    description: "El tren aumenta nuevamente su velocidad hasta alcanzar 150 km/h."
  },
  {
    start: 20,
    end: 25,
    v0: 150 * KMH_TO_MS,
    vf: 150 * KMH_TO_MS,
    title: "Velocidad máxima constante",
    description: "El tren mantiene una velocidad de 150 km/h."
  },
  {
    start: 25,
    end: 30,
    v0: 150 * KMH_TO_MS,
    vf: 150 * KMH_TO_MS,
    title: "Recorrido a máxima velocidad",
    description: "El tren continúa a 150 km/h durante 5 segundos más."
  },
  {
    start: 30,
    end: 50,
    v0: 150 * KMH_TO_MS,
    vf: 0 * KMH_TO_MS,
    title: "Frenado uniforme",
    description: "El tren reduce su velocidad gradualmente hasta detenerse completamente."
  }
];

motionSegments.forEach(segment => {
  segment.duration = segment.end - segment.start;
  segment.acceleration = (segment.vf - segment.v0) / segment.duration;
});

let accumulatedPosition = 0;

motionSegments.forEach(segment => {
  segment.x0 = accumulatedPosition;
  const distance =
    segment.v0 * segment.duration +
    0.5 * segment.acceleration * Math.pow(segment.duration, 2);

  segment.distance = distance;
  accumulatedPosition += distance;
});

const totalDistance = accumulatedPosition;

let currentTime = 0;
let isRunning = false;
let lastTimestamp = null;
let animationId = null;

let fullData = generateFullData();

function resizeCanvas(canvas) {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  const ctx = canvas.getContext("2d");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

function resizeAllCanvases() {
  resizeCanvas(positionCanvas);
  resizeCanvas(velocityCanvas);
  resizeCanvas(accelerationCanvas);
  drawAllCharts(currentTime);
}

window.addEventListener("resize", resizeAllCanvases);
resizeAllCanvases();

function getMotionAtTime(t) {
  if (t >= totalTime) {
    const last = motionSegments[motionSegments.length - 1];

    return {
      segment: last,
      segmentIndex: motionSegments.length - 1,
      localTime: last.duration,
      position: totalDistance,
      velocity: 0,
      acceleration: 0
    };
  }

  const segmentIndex = motionSegments.findIndex(segment => {
    return t >= segment.start && t < segment.end;
  });

  const segment = motionSegments[segmentIndex];
  const localTime = t - segment.start;

  const velocity = segment.v0 + segment.acceleration * localTime;

  const position =
    segment.x0 +
    segment.v0 * localTime +
    0.5 * segment.acceleration * Math.pow(localTime, 2);

  return {
    segment,
    segmentIndex,
    localTime,
    position,
    velocity,
    acceleration: segment.acceleration
  };
}

function generateFullData() {
  const data = [];

  for (let t = 0; t <= totalTime; t += 0.1) {
    const motion = getMotionAtTime(t);

    data.push({
      time: t,
      position: motion.position,
      velocity: motion.velocity * MS_TO_KMH,
      acceleration: motion.acceleration
    });
  }

  return data;
}

function animate(timestamp) {
  if (!isRunning) return;

  if (!lastTimestamp) {
    lastTimestamp = timestamp;
  }

  const delta = (timestamp - lastTimestamp) / 1000;
  lastTimestamp = timestamp;

  currentTime += delta;

  if (currentTime >= totalTime) {
    currentTime = totalTime;
    isRunning = false;
    train.classList.remove("moving");
  }

  updateSimulation();

  if (isRunning) {
    animationId = requestAnimationFrame(animate);
  }
}

function updateSimulation() {
  const motion = getMotionAtTime(currentTime);

  const velocityKmh = motion.velocity * MS_TO_KMH;
  const acceleration = motion.acceleration;
  const position = motion.position;

  timeValue.textContent = `${currentTime.toFixed(2)} s`;
  velocityValue.textContent = `${velocityKmh.toFixed(2)} km/h`;
  accelerationValue.textContent = `${acceleration.toFixed(2)} m/s²`;
  positionValue.textContent = `${position.toFixed(2)} m`;

  phaseTitle.textContent = motion.segment.title;
  phaseDescription.textContent = motion.segment.description;

  updateTrain(position, velocityKmh);
  updateTimeline(motion.segmentIndex);
  drawAllCharts(currentTime);
}

function updateTrain(position, velocityKmh) {
  const sceneWidth = document.querySelector(".track-area").clientWidth;
  const trainWidth = train.clientWidth;

  const maxMove = sceneWidth - trainWidth - 70;
  const progress = position / totalDistance;

  const visualX = progress * maxMove;

  train.style.transform = `translateX(${visualX}px)`;

  const backgroundSpeed = velocityKmh * 2;
  backgroundLines.style.backgroundPositionX = `-${currentTime * backgroundSpeed}px`;

  if (velocityKmh > 1 && isRunning) {
    train.classList.add("moving");
  } else {
    train.classList.remove("moving");
  }

  if (velocityKmh > 120) {
    train.style.filter = "drop-shadow(0 0 16px rgba(0,212,255,0.7))";
  } else if (velocityKmh > 60) {
    train.style.filter = "drop-shadow(0 0 10px rgba(255,209,102,0.55))";
  } else {
    train.style.filter = "none";
  }
}

function updateTimeline(activeIndex) {
  steps.forEach((step, index) => {
    if (index === activeIndex) {
      step.classList.add("active");
    } else {
      step.classList.remove("active");
    }
  });
}

function drawAllCharts(activeTime) {
  drawChart({
    canvas: positionCanvas,
    ctx: positionCtx,
    data: fullData.map(item => ({
      x: item.time,
      y: item.position
    })),
    activeTime,
    title: "Posición",
    yLabel: "m",
    color: "#00d4ff",
    maxY: totalDistance,
    minY: 0
  });

  drawChart({
    canvas: velocityCanvas,
    ctx: velocityCtx,
    data: fullData.map(item => ({
      x: item.time,
      y: item.velocity
    })),
    activeTime,
    title: "Velocidad",
    yLabel: "km/h",
    color: "#36d399",
    maxY: 160,
    minY: 0
  });

  drawChart({
    canvas: accelerationCanvas,
    ctx: accelerationCtx,
    data: fullData.map(item => ({
      x: item.time,
      y: item.acceleration
    })),
    activeTime,
    title: "Aceleración",
    yLabel: "m/s²",
    color: "#ffd166",
    maxY: 5,
    minY: -3
  });
}

function drawChart(config) {
  const {
    canvas,
    ctx,
    data,
    activeTime,
    yLabel,
    color,
    maxY,
    minY
  } = config;

  const width = canvas.getBoundingClientRect().width;
  const height = canvas.getBoundingClientRect().height;

  ctx.clearRect(0, 0, width, height);

  const padding = {
    top: 24,
    right: 20,
    bottom: 38,
    left: 48
  };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  drawGrid(ctx, width, height, padding, chartWidth, chartHeight, minY, maxY, yLabel);

  ctx.beginPath();

  data.forEach((point, index) => {
    const x = padding.left + (point.x / totalTime) * chartWidth;
    const y =
      padding.top +
      chartHeight -
      ((point.y - minY) / (maxY - minY)) * chartHeight;

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.stroke();

  const activeMotion = getMotionAtTime(activeTime);
  let activeY;

  if (canvas === positionCanvas) {
    activeY = activeMotion.position;
  } else if (canvas === velocityCanvas) {
    activeY = activeMotion.velocity * MS_TO_KMH;
  } else {
    activeY = activeMotion.acceleration;
  }

  const activeX = padding.left + (activeTime / totalTime) * chartWidth;
  const activeYPosition =
    padding.top +
    chartHeight -
    ((activeY - minY) / (maxY - minY)) * chartHeight;

  ctx.beginPath();
  ctx.moveTo(activeX, padding.top);
  ctx.lineTo(activeX, padding.top + chartHeight);
  ctx.strokeStyle = "rgba(255,255,255,0.45)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([6, 5]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.beginPath();
  ctx.arc(activeX, activeYPosition, 6, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(activeX, activeYPosition, 10, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.stroke();

  drawAxisLabels(ctx, width, height, padding, yLabel);
}

function drawGrid(ctx, width, height, padding, chartWidth, chartHeight, minY, maxY, yLabel) {
  ctx.save();

  ctx.strokeStyle = "rgba(255,255,255,0.1)";
  ctx.lineWidth = 1;
  ctx.fillStyle = "rgba(255,255,255,0.65)";
  ctx.font = "12px Arial";

  const verticalLines = 5;
  const horizontalLines = 5;

  for (let i = 0; i <= verticalLines; i++) {
    const x = padding.left + (i / verticalLines) * chartWidth;

    ctx.beginPath();
    ctx.moveTo(x, padding.top);
    ctx.lineTo(x, padding.top + chartHeight);
    ctx.stroke();

    const timeLabel = ((i / verticalLines) * totalTime).toFixed(0);
    ctx.fillText(`${timeLabel}s`, x - 10, height - 15);
  }

  for (let i = 0; i <= horizontalLines; i++) {
    const y = padding.top + (i / horizontalLines) * chartHeight;

    ctx.beginPath();
    ctx.moveTo(padding.left, y);
    ctx.lineTo(padding.left + chartWidth, y);
    ctx.stroke();

    const value = maxY - (i / horizontalLines) * (maxY - minY);
    ctx.fillText(value.toFixed(0), 10, y + 4);
  }

  ctx.strokeStyle = "rgba(255,255,255,0.35)";
  ctx.lineWidth = 1.5;

  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, padding.top + chartHeight);
  ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
  ctx.stroke();

  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = "bold 12px Arial";
  ctx.fillText(yLabel, 12, 18);

  ctx.restore();
}

function drawAxisLabels(ctx, width, height, padding, yLabel) {
  ctx.save();

  ctx.fillStyle = "rgba(255,255,255,0.72)";
  ctx.font = "12px Arial";
  ctx.fillText("Tiempo (s)", width / 2 - 30, height - 4);

  ctx.restore();
}

startBtn.addEventListener("click", () => {
  if (currentTime >= totalTime) {
    currentTime = 0;
  }

  if (!isRunning) {
    isRunning = true;
    lastTimestamp = null;
    animationId = requestAnimationFrame(animate);
  }
});

pauseBtn.addEventListener("click", () => {
  isRunning = false;
  lastTimestamp = null;
  train.classList.remove("moving");

  if (animationId) {
    cancelAnimationFrame(animationId);
  }
});

resetBtn.addEventListener("click", () => {
  isRunning = false;
  lastTimestamp = null;
  currentTime = 0;

  if (animationId) {
    cancelAnimationFrame(animationId);
  }

  train.classList.remove("moving");
  updateSimulation();
});

updateSimulation();

console.table(
  motionSegments.map((segment, index) => ({
    tramo: index + 1,
    tiempo: `${segment.start}s - ${segment.end}s`,
    velocidadInicial_kmh: (segment.v0 * MS_TO_KMH).toFixed(2),
    velocidadFinal_kmh: (segment.vf * MS_TO_KMH).toFixed(2),
    aceleracion_ms2: segment.acceleration.toFixed(2),
    distancia_m: segment.distance.toFixed(2),
    posicionInicial_m: segment.x0.toFixed(2),
    posicionFinal_m: (segment.x0 + segment.distance).toFixed(2)
  }))
);