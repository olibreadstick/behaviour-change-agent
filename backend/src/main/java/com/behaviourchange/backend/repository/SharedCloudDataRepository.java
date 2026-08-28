package com.behaviourchange.backend.repository;

import com.behaviourchange.backend.model.SharedCloudData;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SharedCloudDataRepository
    extends JpaRepository<SharedCloudData, String> {

    List<SharedCloudData> findAllByOrderByUpdatedAtDesc();
}
