import {FJS} from "@targoninc/fjs";
import Chart from 'chart.js/auto'; // Import chart.js library

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
        const canvas = FJS.create("canvas").build();
        const ctx = canvas.getContext("2d");

        const labels = statistics.map(entry => new Date(entry.created_at));
        const countData = statistics.map(entry => entry.count);
        const interlinkData = statistics.map(entry => entry.interlink_count);

        new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Count',
                        data: countData,
                        borderColor: 'rgb(255, 99, 132)',
                        fill: false,
                    },
                    {
                        label: 'Interlink Count',
                        data: interlinkData,
                        borderColor: 'rgb(54, 162, 235)',
                        fill: false,
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    xAxes: [{
                        type: 'time',
                        time: {
                            unit: 'day'
                        }
                    }]
                }
            }
        });

        return canvas;
    }
}