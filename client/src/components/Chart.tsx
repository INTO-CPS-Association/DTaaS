import * as React from 'react';
import { Theme, useTheme } from '@mui/material/styles';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Label,
  ResponsiveContainer,
} from 'recharts';
import Title from 'page/Title';

// Generate Sales Data
function createData(time: string, amount: number | undefined) {
  return { time, amount };
}

const data = [
  createData('00:00', 0),
  createData('03:00', 300),
  createData('06:00', 600),
  createData('09:00', 800),
  createData('12:00', 1500),
  createData('15:00', 2000),
  createData('18:00', 2400),
  createData('21:00', 2400),
  createData('24:00', undefined),
];

const chartMargin = {
  top: 16,
  right: 16,
  bottom: 0,
  left: 24,
};

const setStyles = (theme: Theme) => ({
  axisLineStyle: {
    stroke: theme.palette.text.secondary,
    style: theme.typography.body2,
  },
  labelStyle: {
    textAnchor: 'middle' as const,
    fill: theme.palette.text.primary,
    ...theme.typography.body1,
  },
});

function Chart() {
  const theme: Theme = useTheme();

  const { axisLineStyle, labelStyle } = setStyles(theme);

  return (
    <>
      <Title>Observed Output</Title>
      <ResponsiveContainer>
        <LineChart data={data} margin={chartMargin}>
          <XAxis dataKey="time" {...axisLineStyle}></XAxis>
          <YAxis {...axisLineStyle}>
            <Label angle={270} position="left" style={labelStyle}>
              Water Level (cm)
            </Label>
          </YAxis>
          <Line
            isAnimationActive={false}
            type="monotone"
            dataKey="amount"
            stroke={theme.palette.primary.main}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </>
  );
}

export default Chart;
