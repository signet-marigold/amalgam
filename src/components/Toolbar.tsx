interface ToolbarProps {
}

const Toolbar: React.FC<ToolbarProps> = ({ }) => {
  return (
    <div>
      <button className="mx-1 bg-primary hover:bg-primary-hover">Import Media</button>
      <button className="mx-1 bg-primary hover:bg-primary-hover">Export Video</button>
      <select className="mx-1" id="resolution-select" defaultValue="1080p">
        <option value="720p">720p</option>
        <option value="1080p">1080p</option>
        <option value="4k">4K</option>
      </select>
      <select className="mx-1" id="framerate-select" defaultValue="30">
        <option value="24">24 fps</option>
        <option value="30">30 fps</option>
        <option value="60">60 fps</option>
      </select>
    </div>
  );
}

export default Toolbar;
