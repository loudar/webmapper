import {FJS} from "@targoninc/fjs";
import Chart from 'chart.js/auto';
import moment from 'moment';
import 'chartjs-adapter-moment';

export class StatisticsTemplates {
    static statsContainer(statistics) {
        return FJS.create("div")
            .classes("statistics-container")
            .children(
                StatisticsTemplates.stats(statistics)
            )
            .build();
    }

    static stats(statistics) {
        const canvas = FJS.create("canvas").classes("chart").build();
        const ctx = canvas.getContext("2d");

        const labels = statistics.map(entry => new Date(entry.created_at));
        const countData = statistics.map(entry => entry.count);
        const interlinkData = statistics.map(entry => entry.interlink_count);
        const withContentData = statistics.map(entry => entry.content_count);

        const pointRadius = 0;
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'url count',
                        data: countData,
                        borderColor: 'rgb(255, 99, 132)',
                        fill: false,
                        pointRadius,
                    },
                    {
                        label: 'interlinks',
                        data: interlinkData,
                        borderColor: 'rgb(54, 162, 235)',
                        fill: false,
                        pointRadius,
                    },
                    {
                        label: 'with content',
                        data: withContentData,
                        borderColor: 'rgb(20, 210, 120)',
                        fill: false,
                        pointRadius,
                    }
                ]
            },
            options: {
                responsive: false,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        type: 'time',
                        time: {
                            unit: 'hour',
                        },
                        ticks: {
                            autoSkip: true,
                            maxTicksLimit: 288,
                            callback: function(tickValue, index, ticks) {
                                return moment(tickValue).format('HH:mm');
                            }
                        }
                    }
                }
            }
        });

        setTimeout(() => {
            new ResizeObserver(() => {
                chart.resize();
            }).observe(canvas);
        }, 100);

        return canvas;
    }
}