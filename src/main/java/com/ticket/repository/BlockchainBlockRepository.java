package com.ticket.repository;

import com.ticket.model.entity.BlockchainBlock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BlockchainBlockRepository extends JpaRepository<BlockchainBlock, Long> {

    Optional<BlockchainBlock> findTopByOrderByBlockIndexDesc();

    Optional<BlockchainBlock> findByOrderId(String orderId);

    Optional<BlockchainBlock> findByBlockHash(String blockHash);

    List<BlockchainBlock> findAllByOrderByBlockIndexDesc();

    List<BlockchainBlock> findAllByOrderByBlockIndexAsc();
}
