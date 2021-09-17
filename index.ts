// Import stylesheets
import './style.css';
import 'simscript/dist/simscript.css';
import { SimulationState, Animation, Entity, format, bind } from 'simscript';
import { Crosswalk, Pedestrian } from './crosswalk';

// get the start button
const 
  btnStart = document.getElementById('start') as HTMLButtonElement,
  runText = '&#9654; Run',
  stopText = '&#9632; Stop';
btnStart.innerHTML = runText;

// create the simulation
const sim = new Crosswalk({
  frameDelay: 20, // 20 ms per frame
});
sim.stateChanged.addEventListener(() => {

  // update button content
  btnStart.innerHTML =
    sim.state == SimulationState.Running ? stopText : runText;

  // show stats
  if (sim.state != SimulationState.Running) {
    showStats(sim);
  }
});

// create the animated queue elements
document.getElementById('queues').outerHTML = `
    ${createX3Queue('car-arr', -250, 0)}
    ${createX3Queue('car-xing', -50, 0)}
    ${createX3Queue('car-xed', +250, 0)}
    ${createX3Queue('ped-arr', -125, -100)}
    ${createX3Queue('ped-xing', 0, -75, 5)}
    ${createX3Queue('ped-xed', 0, 75, 5)}
    ${createX3Queue('ped-leave', +250, 100)}
`;

// create the animation
const animationHost = document.querySelector('x3d.ss-anim');
new Animation(sim, animationHost, {
  rotateEntities: true,
  getEntityHtml: (e: Entity) => {
    if (e instanceof Pedestrian) {
      return createX3Person('pedestrian');
    } else {
      return e.serial % 2
        ? createX3Car('car red', 30, 14, 8, 1, 0, 0)
        : createX3Car('car green', 25, 12, 8, 1, 1, 0);
    }
  },
  queues: [
    { queue: sim.qPedArr, element: 'x3d .ss-queue.ped-arr' },
    {
      queue: sim.qPedXing,
      element: 'x3d .ss-queue.ped-xing',
      angle: -45,
      max: 8
    },
    { queue: sim.qPedXed, element: 'x3d .ss-queue.ped-xed' },
    { queue: sim.qPedLeave, element: 'x3d .ss-queue.ped-leave' },
    { queue: sim.qCarArr, element: 'x3d .ss-queue.car-arr' },
    {
      queue: sim.qCarXing,
      element: 'x3d .ss-queue.car-xing',
      angle: 0,
      max: 16
    },
    { queue: sim.qCarXed, element: 'x3d .ss-queue.car-xed' }
  ]
});

// update semaphore and timeNow display when the time changes
const lights = animationHost.querySelectorAll('material.light');
const timeNow = document.querySelector('.ss-time-now span');
sim.timeNowChanged.addEventListener(() => {
  timeNow.textContent = format(sim.timeNow / 3600);
  for (let i = 0; i < lights.length; i++) {
    const e = lights[i] as HTMLElement;
    e.setAttribute('transparency', i == sim.light ? '0' : '0.7');
    e.closest('transform').setAttribute(
      'scale',
      i == sim.light ? '1.1 1.1 1.1' : '.9 .9 .9'
    );
  }
});

// run the simulation
btnStart.addEventListener('click', e => {
  if (sim.state == SimulationState.Running) {
    sim.stop();
  } else {
    sim.start(e.ctrlKey ? true : null);
  }
});

// handle simulation parameters
bind('red', sim.cycle.red, v => (sim.cycle.red = v));
bind('yellow', sim.cycle.yellow, v => (sim.cycle.yellow = v));
bind('green', sim.cycle.green, v => (sim.cycle.green = v));

// show simulation statistics
function showStats(sim: Crosswalk) {
  // calculate waiting times (to compare with simulated values)
  const c = sim.cycle;
  const cTot = c.red + c.yellow + c.green;
  const wPavg = (((c.yellow + c.red) / cTot) * (c.yellow + c.red)) / 2;
  const wCavg = (((c.yellow + c.green) / cTot) * (c.yellow + c.green)) / 2;
  const wPmax = c.yellow + c.red;
  const wCmax = c.yellow + c.green;

  document.getElementById('output').innerHTML =
    `
      <ul>
        <li>Simulated time: <b>${format(sim.timeNow / 60 / 60)}</b> hours</li>
        <li>Elapsed time: <b>${format(sim.timeElapsed / 1000)}</b> seconds</li>
        <li>
          Average Pedestrian Wait:
          <b>${format(sim.qPedXing.grossDwell.avg)}</b>
          <i>(${format(wPavg)})</i> seconds
        </li>
        <li>
          Longest Pedestrian Wait:
          <b>${format(sim.qPedXing.grossDwell.max)}</b>
          <i>(${format(wPmax)})</i> seconds
        </li>
        <li>
          Average Car Wait:
          <b>${format(sim.qCarXing.grossDwell.avg)}</b>
          <i>(${format(wCavg)})</i> seconds
        </li>
        <li>
          Longest Car Wait:
          <b>${format(sim.qCarXing.grossDwell.max)}</b>
          <i>(${format(wCmax)})</i> seconds
        </li>
        <li>Pedestrian Count: <b>${format(
          sim.qPedXing.grossDwell.cnt,
          0
        )}</b></li>
        <li>Car Count: <b>${format(sim.qCarXing.grossDwell.cnt, 0)}</b></li>
      </ul>` +
    // show pedestrian queue's population histogram
    sim.qPedXing.grossPop.getHistogramChart('Pedestrians waiting to cross') +
    // show car queue's population histogram
    sim.qCarXing.grossPop.getHistogramChart('Cars waiting to cross');
}

// create X2DOM elements
function createX3Queue(name: string, x: number, y: number, z = 0): string {
  return `
        <transform class='ss-queue ${name}' translation='${x} ${y} ${z}'>
            <shape>
                <appearance>
                    <material diffuseColor='1 1 0' transparency='0.6'></material>
                </appearance>
                <sphere radius='4'></sphere>
            </shape>
        </transform>`;
}
function createX3Car(
  name: string,
  w: number,
  h: number,
  d: number,
  r: number,
  g: number,
  b: number
): string {
  return `<transform class='ss-car ${name}' translation='0 0 ${h / 2}'>
        <transform>
            <shape> <!-- body -->
                <appearance>
                    <material diffuseColor='${r} ${g} ${b}'></material>
                </appearance>
                <box size='${w} ${h} ${d}'></box>
            </shape>
            <shape render='false'> <!-- 5 unit padding -->
                <box size='${w * 1.1} ${h * 1.1} ${d * 1.1}'></box>
            </shape>
        </transform>
        <transform translation='${-w * 0.2} 0 ${+d * 0.5}'>
            <shape> <!-- cabin -->
                <appearance>
                    <material diffuseColor='${r / 3} ${g / 3} ${b /
    3}'></material>
                </appearance>
                <box size='${w * 0.5} ${h * 0.75} ${d}'></box>
            </shape>
        </transform>
        <transform translation='${-w / 2 + 4} 0 -2'>
            <shape> <!-- front wheels -->
                <appearance>
                    <material diffuseColor='0 0 0'></material>
                </appearance>
                <cylinder radius='3' height='${h + 2}'></cylinder>
            </shape>
        </transform>
        <transform translation='${+w / 2 - 4} 0 -2'>
            <shape> <!-- rear wheels -->
                <appearance>
                    <material diffuseColor='0 0 0'></material>
                </appearance>
                <cylinder radius='3' height='${h + 2}'></cylinder>
            </shape>
        </transform>
    </transform>`;
}
function createX3Person(name: string) {
  return `<transform class='${name}'>
        <transform>
            <shape>
                <appearance> 
                    <material diffuseColor='0 0 .5'></material>
                </appearance>
                <box size='5 5 8'></box>
            </shape>
            <shape render='false'> <!-- padding -->
                <box size='7 10 8'></box>
            </shape>
        </transform>
        <transform translation='0 0 8'>
            <shape>
                <appearance> 
                    <material diffuseColor='0 1 0'></material>
                </appearance>
                <box size='5 8 8'></box>
            </shape>
        </transform>
        <transform translation='0 0 16'>
            <shape>
                <appearance> 
                    <material diffuseColor='.5 .5 0'></material>
                </appearance>
                <sphere radius='3'></sphere>
            </shape>
        </transform>
    </transform>`;
}
