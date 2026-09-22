package com.ticket.service;

import io.micrometer.core.instrument.Counter;
import io.micrometer.core.instrument.MeterRegistry;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MetricsService {

    private final MeterRegistry meterRegistry;

    private Counter queueJoinCounter;
    private Counter queueAdmitCounter;
    private Counter ordersCreatedCounter;
    private Counter ordersConfirmedCounter;
    private Counter paymentSuccessCounter;
    private Counter paymentFailureCounter;

    @PostConstruct
    public void initMetrics() {
        this.queueJoinCounter = Counter.builder("flashsale_queue_join_total")
                .description("Total users who joined the virtual waiting room queue")
                .register(meterRegistry);

        this.queueAdmitCounter = Counter.builder("flashsale_queue_admit_total")
                .description("Total users admitted from waiting room into checkout")
                .register(meterRegistry);

        this.ordersCreatedCounter = Counter.builder("flashsale_orders_created_total")
                .description("Total ticket hold orders created")
                .register(meterRegistry);

        this.ordersConfirmedCounter = Counter.builder("flashsale_orders_confirmed_total")
                .description("Total orders confirmed after successful payment")
                .register(meterRegistry);

        this.paymentSuccessCounter = Counter.builder("flashsale_payment_success_total")
                .description("Total successful payment transactions")
                .register(meterRegistry);

        this.paymentFailureCounter = Counter.builder("flashsale_payment_failure_total")
                .description("Total failed payment transactions")
                .register(meterRegistry);
    }

    public void incrementQueueJoin() {
        if (queueJoinCounter != null) queueJoinCounter.increment();
    }

    public void incrementQueueAdmit(double count) {
        if (queueAdmitCounter != null) queueAdmitCounter.increment(count);
    }

    public void incrementOrdersCreated() {
        if (ordersCreatedCounter != null) ordersCreatedCounter.increment();
    }

    public void incrementOrdersConfirmed() {
        if (ordersConfirmedCounter != null) ordersConfirmedCounter.increment();
    }

    public void incrementPaymentSuccess() {
        if (paymentSuccessCounter != null) paymentSuccessCounter.increment();
    }

    public void incrementPaymentFailure() {
        if (paymentFailureCounter != null) paymentFailureCounter.increment();
    }
}
