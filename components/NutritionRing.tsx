import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

interface NutritionRingProps {
  current: number;
  target: number;
  color: string;
  label: string;
  unit: string;
  radius?: number;
  stroke?: number;
}

const NutritionRing: React.FC<NutritionRingProps> = ({ 
  current, 
  target, 
  color, 
  label, 
  unit,
  radius = 30,
  stroke = 6
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const percentage = Math.min(1, Math.max(0, current / target));
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage * circumference);

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const g = svg.append("g")
      .attr("transform", `translate(${radius + stroke}, ${radius + stroke})`);

    // Background circle
    g.append("circle")
      .attr("r", radius)
      .attr("fill", "none")
      .attr("stroke", "#e5e7eb")
      .attr("stroke-width", stroke)
      .attr("stroke-linecap", "round");

    // Foreground circle
    g.append("circle")
      .attr("r", radius)
      .attr("fill", "none")
      .attr("stroke", color)
      .attr("stroke-width", stroke)
      .attr("stroke-dasharray", circumference)
      .attr("stroke-dashoffset", offset)
      .attr("stroke-linecap", "round")
      .attr("transform", "rotate(-90)");

  }, [current, target, color, radius, stroke]);

  return (
    <div className="flex flex-col items-center">
      <svg ref={svgRef} width={(radius + stroke) * 2} height={(radius + stroke) * 2} className="mb-2" />
      <span className="text-xs font-semibold text-gray-500">{label}</span>
      <span className="text-xs font-bold text-gray-900">{Math.round(current)}{unit}</span>
    </div>
  );
};

export default NutritionRing;