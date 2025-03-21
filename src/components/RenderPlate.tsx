interface RenderPlateProps {
}

const RenderPlate: React.FC<RenderPlateProps> = ({ }) => {
  return (
    <section>
      <div className="">
        <canvas id="preview-canvas"></canvas>
        <div className="">
          <button id="play-pause-btn" className="">▶</button>
          <div id="time-display" className="">00:00:00 / 00:00:00</div>
        </div>
      </div>
    </section>
  );
}

export default RenderPlate;
