package com.behaviourchange.backend.repository;

import com.behaviourchange.backend.model.Admin;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AdminRepository
        extends JpaRepository<Admin, String> {

    Optional<Admin> findByUsernameIgnoreCase(
            String username
    );
}
