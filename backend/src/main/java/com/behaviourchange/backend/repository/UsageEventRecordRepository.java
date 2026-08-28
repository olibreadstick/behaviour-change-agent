package com.behaviourchange.backend.repository;

import com.behaviourchange.backend.model.UsageEventRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface UsageEventRecordRepository
    extends JpaRepository<UsageEventRecord, String> {

    List<UsageEventRecord> findAllByOrderByCreatedAtAsc();
}
