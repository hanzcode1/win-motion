declare const React: any;
declare const Remotion: {
  useCurrentFrame: () => number;
  useVideoConfig: () => { fps: number; durationInFrames: number; width: number; height: number };
  interpolate: (input: number, inputRange: number[], outputRange: number[], opts?: any) => number;
  spring: (opts: { frame: number; fps: number; config?: any }) => number;
  AbsoluteFill: any;
};

const { useCurrentFrame, useVideoConfig, interpolate, spring, AbsoluteFill } = Remotion;

interface Props {
  title?: string;
  subtitle?: string;
  color1?: string;
  color2?: string;
  showIcon?: boolean;
}

export default function HelloWorld(props: Props) {
  const frame = useCurrentFrame();
  const { fps, durationInFrames, width, height } = useVideoConfig();

  const title = props.title || 'Hello, World!';
  const subtitle = props.subtitle || 'Win Motion Studio';
  const color1 = props.color1 || '#0078d4';
  const color2 = props.color2 || '#00b7c3';
  const showIcon = props.showIcon !== false;

  // Responsive font size berdasarkan tinggi video
  const baseFont = Math.min(height * 0.14, width * 0.08);
  const subFont = baseFont * 0.32;

  const opacity = interpolate(frame, [0, Math.min(20, durationInFrames * 0.2)], [0, 1], { extrapolateRight: 'clamp' });
  const scale = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const rotate = interpolate(frame, [0, durationInFrames], [0, 360]);

  return React.createElement(
    AbsoluteFill,
    {
      style: {
        background: `linear-gradient(135deg, ${color1} 0%, ${color2} 100%)`,
        flexDirection: 'column',
        fontFamily: '"Poppins", "Segoe UI", sans-serif',
        color: 'white'
      }
    },
    React.createElement(
      'div',
      { style: { opacity, transform: `scale(${scale})`, textAlign: 'center', padding: '5%' } },
      React.createElement(
        'h1',
        {
          style: {
            fontSize: baseFont,
            margin: 0,
            fontWeight: 700,
            letterSpacing: '-0.03em',
            lineHeight: 1.1
          }
        },
        title
      ),
      React.createElement(
        'p',
        { style: { fontSize: subFont, marginTop: baseFont * 0.2, opacity: 0.9, fontWeight: 300 } },
        subtitle
      ),
      showIcon && React.createElement(
        'div',
        {
          style: {
            marginTop: baseFont * 0.4,
            display: 'inline-block',
            transform: `rotate(${rotate}deg)`,
            fontSize: baseFont * 0.75
          }
        },
        '⚙️'
      )
    )
  );
}