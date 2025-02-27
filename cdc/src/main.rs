use std::{sync::Arc, time::Duration};

use anyhow::Result;
use async_trait::async_trait;
use scylla::SessionBuilder;
use scylla_cdc::{
    consumer::{CDCRow, Consumer, ConsumerFactory},
    log_reader::CDCLogReaderBuilder,
};

struct PrinterConsumer;

#[async_trait]
impl Consumer for PrinterConsumer {
    async fn consume_cdc(&mut self, data: CDCRow<'_>) -> anyhow::Result<()> {
        println!("1");
        let column_names = data.get_non_cdc_column_names();
        let mut s = String::new();
        for column in column_names {
            if !s.is_empty() {
                s.push_str(", ");
            }
            s.push_str(column);
        }

        println!("{s}");
        Ok(())
    }
}

struct PrinterConsumerFactory;

#[async_trait]
impl ConsumerFactory for PrinterConsumerFactory {
    async fn new_consumer(&self) -> Box<dyn Consumer> {
        Box::new(PrinterConsumer)
    }
}

#[tokio::main]
async fn main() -> Result<()> {
    let session = Arc::new(
        SessionBuilder::new()
            .known_nodes(["localhost:9042", "localhost:9043", "localhost:9044"])
            .build()
            .await?,
    );

    let consumer_factory = Arc::new(PrinterConsumerFactory);

    let (mut cdc_log_reader, handle) = CDCLogReaderBuilder::new()
        .session(session)
        .keyspace("ks")
        .table_name("t")
        .window_size(Duration::from_secs(6))
        .safety_interval(Duration::from_secs(3))
        .sleep_interval(Duration::from_secs(1))
        .consumer_factory(consumer_factory)
        .build()
        .await?;

    println!("listening...");
    tokio::signal::ctrl_c().await.unwrap();
    println!("Shutting down...");
    cdc_log_reader.stop();
    handle.await
}
