const GradientBackground = () => {
  return (
    <div className="fixed inset-0 overflow-hidden gradient-background">
      {/* Floating orbs for depth */}
      <div 
        className="gradient-orb w-[600px] h-[600px] -top-32 -left-32"
        style={{ 
          background: 'radial-gradient(circle, hsl(210 100% 30% / 0.4) 0%, transparent 70%)',
          animationDelay: '0s'
        }} 
      />
      <div 
        className="gradient-orb w-[800px] h-[800px] top-1/4 right-0 translate-x-1/2"
        style={{ 
          background: 'radial-gradient(circle, hsl(280 60% 40% / 0.3) 0%, transparent 70%)',
          animationDelay: '-5s'
        }} 
      />
      <div 
        className="gradient-orb w-[700px] h-[700px] bottom-0 left-1/4 translate-y-1/2"
        style={{ 
          background: 'radial-gradient(circle, hsl(322 80% 55% / 0.4) 0%, transparent 70%)',
          animationDelay: '-10s'
        }} 
      />
      <div 
        className="gradient-orb w-[500px] h-[500px] bottom-1/4 right-1/4"
        style={{ 
          background: 'radial-gradient(circle, hsl(330 80% 65% / 0.3) 0%, transparent 70%)',
          animationDelay: '-15s'
        }} 
      />
    </div>
  );
};

export default GradientBackground;
