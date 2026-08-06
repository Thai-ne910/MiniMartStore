window.MiniAdminDashboard = (function () {
    let ordersChart = null;
    let customersChart = null;
    const doughnutCharts = [];

    const colors = {
        primary: "#2f7cc7",
        primaryLight: "rgba(47, 124, 199, 0.12)",
        success: "#10b981",
        warning: "#f59e0b",
        danger: "#e11d48",
        muted: "#dbe3ec",
        text: "#334155"
    };

    function money(value) {
        return new Intl.NumberFormat("vi-VN").format(value || 0) + " đ";
    }

    function ensureChartJs() {
        if (typeof Chart === "undefined") {
            console.warn("Chart.js chưa được tải. Dashboard vẫn hiển thị nhưng không có biểu đồ.");
            return false;
        }

        Chart.defaults.font.family = "'Be Vietnam Pro', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";
        Chart.defaults.color = colors.text;

        return true;
    }

    function createDoughnutCharts(items) {
        const maxCount = Math.max(...items.map(x => x.count), 1);

        items.forEach(function (item) {
            const canvas = document.getElementById(item.id);

            if (!canvas) {
                return;
            }

            const activeValue = item.count > 0 ? item.count : 0;
            const remainValue = Math.max(maxCount - activeValue, 1);

            const chart = new Chart(canvas, {
                type: "doughnut",
                data: {
                    labels: ["Chưa hoàn tất", "Còn lại"],
                    datasets: [{
                        data: [activeValue, remainValue],
                        backgroundColor: [
                            activeValue > 0 ? colors.primary : colors.muted,
                            colors.muted
                        ],
                        borderColor: "#ffffff",
                        borderWidth: 5,
                        hoverOffset: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    cutout: "82%",
                    plugins: {
                        legend: {
                            display: false
                        },
                        tooltip: {
                            callbacks: {
                                title: function () {
                                    return item.title;
                                },
                                label: function (context) {
                                    if (context.dataIndex === 0) {
                                        return "Đơn hàng: " + item.count + " | Tổng tiền: " + money(item.amount);
                                    }

                                    return "";
                                }
                            },
                            filter: function (context) {
                                return context.dataIndex === 0;
                            }
                        }
                    }
                }
            });

            doughnutCharts.push(chart);
        });
    }

    function buildLineChart(canvasId, period, type) {
        const canvas = document.getElementById(canvasId);

        if (!canvas || !period) {
            return null;
        }

        const ctx = canvas.getContext("2d");
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height || 260);

        if (type === "customers") {
            gradient.addColorStop(0, "rgba(16, 185, 129, 0.30)");
            gradient.addColorStop(1, "rgba(16, 185, 129, 0.02)");
        }
        else {
            gradient.addColorStop(0, "rgba(47, 124, 199, 0.30)");
            gradient.addColorStop(1, "rgba(47, 124, 199, 0.02)");
        }

        const dataValues = type === "customers"
            ? period.counts
            : period.amounts;

        return new Chart(canvas, {
            type: "line",
            data: {
                labels: period.labels,
                datasets: [{
                    label: type === "customers" ? "Đăng ký" : "Doanh thu",
                    data: dataValues,
                    borderColor: type === "customers" ? colors.success : colors.primary,
                    backgroundColor: gradient,
                    fill: true,
                    tension: 0.38,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHitRadius: 12,
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: {
                    mode: "index",
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        backgroundColor: "rgba(15, 23, 42, 0.92)",
                        padding: 12,
                        titleFont: {
                            weight: "700"
                        },
                        bodyFont: {
                            weight: "600"
                        },
                        callbacks: {
                            title: function (items) {
                                const index = items[0].dataIndex;
                                return period.labels[index];
                            },
                            label: function (item) {
                                const index = item.dataIndex;

                                if (type === "customers") {
                                    return period.tooltips[index] || ("Đăng ký: " + period.counts[index]);
                                }

                                return period.tooltips[index] || ("Doanh thu: " + money(period.amounts[index]));
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        display: false,
                        grid: {
                            display: false
                        }
                    },
                    y: {
                        display: false,
                        beginAtZero: true,
                        grid: {
                            display: false
                        }
                    }
                }
            }
        });
    }

    function setActiveButton(group, selectedIndex) {
        group.querySelectorAll(".dashboard-period-btn").forEach(function (button) {
            const index = Number(button.dataset.periodIndex);
            button.classList.toggle("active", index === selectedIndex);
        });
    }

    function bindPeriodButtons(data) {
        document.querySelectorAll(".dashboard-period-buttons").forEach(function (group) {
            const target = group.dataset.chartTarget;

            group.querySelectorAll(".dashboard-period-btn").forEach(function (button) {
                button.addEventListener("click", function () {
                    const index = Number(button.dataset.periodIndex);

                    setActiveButton(group, index);

                    if (target === "orders") {
                        if (ordersChart) {
                            ordersChart.destroy();
                        }

                        const selected = data.orders[index];
                        ordersChart = buildLineChart("orders-chart", selected, "orders");

                        const sum = document.getElementById("orders-current-sum");
                        if (sum) {
                            sum.textContent = money(selected.totalAmount);
                        }
                    }

                    if (target === "customers") {
                        if (customersChart) {
                            customersChart.destroy();
                        }

                        customersChart = buildLineChart("customers-chart", data.registrations[index], "customers");
                    }
                });
            });
        });
    }

    return {
        init: function (data) {
            if (!ensureChartJs()) {
                return;
            }

            createDoughnutCharts(data.incomplete || []);

            if (data.orders && data.orders.length > 0) {
                ordersChart = buildLineChart("orders-chart", data.orders[0], "orders");
            }

            if (data.registrations && data.registrations.length > 0) {
                customersChart = buildLineChart("customers-chart", data.registrations[0], "customers");
            }

            bindPeriodButtons(data);
        }
    };
})();