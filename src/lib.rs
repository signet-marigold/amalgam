use ffmpeg_next as ffmpeg;
use ffmpeg::{format, frame, media, software};

fn main() -> Result<(), ffmpeg::Error> {
    // Initialize ffmpeg; this must be done before any other ffmpeg calls.
    ffmpeg::init()?;

    // Specify the video file path you want to decode.
    let filename = "test.mp4";

    // Open the input file.
    let mut ictx = format::input(&filename)?;

    // Find the best video stream in the file.
    let input_stream = ictx
        .streams()
        .best(media::Type::Video)
        .ok_or(ffmpeg::Error::StreamNotFound)?;
    let video_stream_index = input_stream.index();

    // Create a codec context from the stream's parameters.
    let context_decoder =
        ffmpeg::codec::context::Context::from_parameters(input_stream.parameters())?;
    let mut decoder = context_decoder.decoder().video()?;

    // Set up a scaler to convert from the native pixel format to RGB24.
    // This is often more convenient for further processing or rendering.
    let mut scaler = software::scaling::Context::get(
        decoder.format(),
        decoder.width(),
        decoder.height(),
        ffmpeg::format::Pixel::RGB24,
        decoder.width(),
        decoder.height(),
        software::scaling::flag::Flags::BILINEAR,
    )?;

    // Create containers for frames.
    let mut decoded_frame = frame::Video::empty();
    let mut rgb_frame = frame::Video::empty();

    // Iterate over packets in the input context.
    for (stream, packet) in ictx.packets() {
        // Only process packets from the video stream.
        if stream.index() == video_stream_index {
            // Send the packet to the decoder.
            decoder.send_packet(&packet)?;

            // Continuously try to receive frames until there are none left.
            while decoder.receive_frame(&mut decoded_frame).is_ok() {
                // Convert the frame to RGB24.
                scaler.run(&decoded_frame, &mut rgb_frame)?;

                // Here, you have the frame data in `rgb_frame` (RGB24 format).
                // You could upload it to a GPU texture or process it further.
                //
                // For demonstration, we simply print out some frame details.
                println!(
                    "Frame timestamp: {:?}, size: {}x{}, format: {:?}",
                    rgb_frame.timestamp(),
                    rgb_frame.width(),
                    rgb_frame.height(),
                    rgb_frame.format()
                );
            }
        }
    }

    // Flush the decoder to process any remaining frames.
    decoder.send_eof()?;
    while decoder.receive_frame(&mut decoded_frame).is_ok() {
        scaler.run(&decoded_frame, &mut rgb_frame)?;
        println!("Flushed frame: {:?}", rgb_frame.timestamp());
    }

    Ok(())
}

