interface ClipPoolProps {
}

const ClipPool: React.FC<ClipPoolProps> = ({ }) => {
  return (
    <section className="clip-pool-container border-t-1 border-bordercolor px-2 py-1">
      <h3>Media Library</h3>
      <div id="clip-pool" className="min-h-10 ">
      </div>
      <div className="py-2">
        <button id="add-to-timeline-btn" className="p-0 px-2 h-7 mr-1" disabled>Add to Timeline</button>
        <button id="delete-clip-btn" className="p-0 px-2 h-7 mx-1 text-white bg-warning hover:bg-warning-hover" disabled>Delete</button>
      </div>
    </section>
  );
}

export default ClipPool;
