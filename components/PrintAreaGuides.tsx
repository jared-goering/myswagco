'use client'

import React from 'react'
import { Rect, Line, Circle, Group, Text } from 'react-konva'
import { motion } from 'framer-motion'

interface PrintAreaGuidesProps {
  printArea: { x: number; y: number; width: number; height: number }
  showGrid?: boolean
  showSafeArea?: boolean
  animated?: boolean
}

export default function PrintAreaGuides({
  printArea,
  showGrid = true,
  showSafeArea = true,
  animated = true,
}: PrintAreaGuidesProps) {
  const gridSize = 20
  const safeMargin = 10 // pixels from edge

  // Calculate grid lines
  const verticalLines = []
  const horizontalLines = []

  if (showGrid) {
    for (let i = 0; i <= printArea.width; i += gridSize) {
      verticalLines.push(i)
    }
    for (let i = 0; i <= printArea.height; i += gridSize) {
      horizontalLines.push(i)
    }
  }

  return (
    <Group>
      {/* Grid Lines */}
      {showGrid && verticalLines.map((x, i) => (
        <Line
          key={`v-${i}`}
          points={[
            printArea.x + x,
            printArea.y,
            printArea.x + x,
            printArea.y + printArea.height,
          ]}
          stroke="#e5e7eb"
          strokeWidth={0.5}
          dash={[2, 4]}
          listening={false}
          opacity={0.5}
        />
      ))}
      {showGrid && horizontalLines.map((y, i) => (
        <Line
          key={`h-${i}`}
          points={[
            printArea.x,
            printArea.y + y,
            printArea.x + printArea.width,
            printArea.y + y,
          ]}
          stroke="#e5e7eb"
          strokeWidth={0.5}
          dash={[2, 4]}
          listening={false}
          opacity={0.5}
        />
      ))}

      {/* Center crosshair */}
      <Group opacity={0.4}>
        <Line
          points={[
            printArea.x + printArea.width / 2,
            printArea.y,
            printArea.x + printArea.width / 2,
            printArea.y + printArea.height,
          ]}
          stroke="#9ca3af"
          strokeWidth={1}
          dash={[5, 5]}
          listening={false}
        />
        <Line
          points={[
            printArea.x,
            printArea.y + printArea.height / 2,
            printArea.x + printArea.width,
            printArea.y + printArea.height / 2,
          ]}
          stroke="#9ca3af"
          strokeWidth={1}
          dash={[5, 5]}
          listening={false}
        />
        <Circle
          x={printArea.x + printArea.width / 2}
          y={printArea.y + printArea.height / 2}
          radius={3}
          fill="#9ca3af"
          listening={false}
        />
      </Group>

      {/* Safe area guide */}
      {showSafeArea && (
        <Rect
          x={printArea.x + safeMargin}
          y={printArea.y + safeMargin}
          width={printArea.width - safeMargin * 2}
          height={printArea.height - safeMargin * 2}
          stroke="#22c55e"
          strokeWidth={1}
          dash={[3, 3]}
          listening={false}
          opacity={0.6}
        />
      )}

      {/* Print area boundary */}
      <Rect
        x={printArea.x}
        y={printArea.y}
        width={printArea.width}
        height={printArea.height}
        stroke="#3b82f6"
        strokeWidth={2}
        dash={animated ? [8, 4] : undefined}
        dashEnabled={animated}
        listening={false}
        opacity={0.8}
      />

      {/* Corner markers */}
      {[
        { x: printArea.x, y: printArea.y },
        { x: printArea.x + printArea.width, y: printArea.y },
        { x: printArea.x, y: printArea.y + printArea.height },
        { x: printArea.x + printArea.width, y: printArea.y + printArea.height },
      ].map((corner, i) => (
        <Circle
          key={`corner-${i}`}
          x={corner.x}
          y={corner.y}
          radius={3}
          fill="#3b82f6"
          listening={false}
        />
      ))}
    </Group>
  )
}

